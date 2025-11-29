import type { Config } from "tailwindcss";

const config: Config = {
  // ✅ CRITICAL: darkMode must be 'class' for manual theme switching
  darkMode: ["class"],
  
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  
  theme: {
    extend: {
      colors: {
        // ✅ YouTube Brand Colors (using CSS variables)
        youtube: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          disabled: "var(--text-disabled)",
          hover: "var(--bg-hover)",
          DEFAULT: "var(--border-color)",
          red: "var(--youtube-red)",
          "red-hover": "var(--youtube-red-hover)",
        },
        
        // ✅ Background Colors (prefixed versions)
        "bg-youtube-primary": "var(--bg-primary)",
        "bg-youtube-secondary": "var(--bg-secondary)",
        "bg-youtube-tertiary": "var(--bg-tertiary)",
        "bg-youtube-hover": "var(--bg-hover)",
        
        // ✅ Direct YouTube Color Variables
        "youtube-primary": "var(--bg-primary)",
        "youtube-secondary": "var(--bg-secondary)",
        "youtube-tertiary": "var(--bg-tertiary)",
        "youtube-hover": "var(--bg-hover)",
        "youtube-text-primary": "var(--text-primary)",
        "youtube-text-secondary": "var(--text-secondary)",
        "youtube-text-disabled": "var(--text-disabled)",
        "youtube-border": "var(--border-color)",
        "youtube-divider": "var(--divider)",
        "youtube-red": "var(--youtube-red)",
        "youtube-red-hover": "var(--youtube-red-hover)",
        
        // ✅ Shadcn/UI Colors
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          hover: "var(--destructive-hover)",
        },
        muted: "var(--muted)",
        accent: "var(--accent)",
        border: "var(--border-color)",
      },
      
      // ✅ Border Radius
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      
      // ✅ Background Color Extensions
      backgroundColor: {
        "youtube-primary": "var(--bg-primary)",
        "youtube-secondary": "var(--bg-secondary)",
        "youtube-tertiary": "var(--bg-tertiary)",
        "youtube-hover": "var(--bg-hover)",
      },
      
      // ✅ Text Color Extensions
      textColor: {
        "youtube-primary": "var(--text-primary)",
        "youtube-secondary": "var(--text-secondary)",
        "youtube-disabled": "var(--text-disabled)",
      },
      
      // ✅ Border Color Extensions
      borderColor: {
        youtube: "var(--border-color)",
      },
      
      // ✅ Keyframe Animations
      keyframes: {
        // ═══════════════════════════════════════
        // FADE ANIMATIONS
        // ═══════════════════════════════════════
        "fade-in": {
          from: { opacity: "0", transform: "scale(0.8)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        
        // ═══════════════════════════════════════
        // SCALE ANIMATIONS
        // ═══════════════════════════════════════
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        
        // ═══════════════════════════════════════
        // SLIDE ANIMATIONS
        // ═══════════════════════════════════════
        slideUp: {
          from: { opacity: "0", transform: "translateY(100%)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        
        // ═══════════════════════════════════════
        // BOUNCE ANIMATIONS
        // ═══════════════════════════════════════
        "bounce-once": {
          "0%, 100%": { transform: "translateY(0)" },
          "25%": { transform: "translateY(-10px)" },
          "50%": { transform: "translateY(0)" },
          "75%": { transform: "translateY(-5px)" },
        },
        "bounce-dot": {
          "0%, 80%, 100%": { transform: "scale(0)", opacity: "0.3" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        
        // ═══════════════════════════════════════
        // PULSE ANIMATIONS
        // ═══════════════════════════════════════
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.1)", opacity: "0.7" },
          "100%": { transform: "scale(1.2)", opacity: "0" },
        },
        "profile-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.7)" },
          "50%": { boxShadow: "0 0 0 15px rgba(16, 185, 129, 0)" },
        },
        
        // ═══════════════════════════════════════
        // LIKE/DISLIKE ANIMATIONS - DESKTOP
        // ═══════════════════════════════════════
        "like-bounce": {
          "0%": { transform: "scale(1)" },
          "15%": { transform: "scale(1.3) rotate(-10deg)" },
          "30%": { transform: "scale(0.9) rotate(5deg)" },
          "45%": { transform: "scale(1.15) rotate(-5deg)" },
          "60%": { transform: "scale(0.95) rotate(2deg)" },
          "75%": { transform: "scale(1.05) rotate(-1deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
        "dislike-bounce": {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "15%": { transform: "scale(1.3) rotate(10deg)" },
          "30%": { transform: "scale(0.9) rotate(-5deg)" },
          "45%": { transform: "scale(1.15) rotate(5deg)" },
          "60%": { transform: "scale(0.95) rotate(-2deg)" },
          "75%": { transform: "scale(1.05) rotate(1deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
        
        // ═══════════════════════════════════════
        // LIKE/DISLIKE ANIMATIONS - MOBILE
        // ═══════════════════════════════════════
        "like-bounce-mobile": {
          "0%": { transform: "scale(1)" },
          "20%": { transform: "scale(1.4) rotate(-12deg)" },
          "40%": { transform: "scale(0.85) rotate(6deg)" },
          "60%": { transform: "scale(1.2) rotate(-6deg)" },
          "80%": { transform: "scale(0.92) rotate(3deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
        "dislike-bounce-mobile": {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "20%": { transform: "scale(1.4) rotate(12deg)" },
          "40%": { transform: "scale(0.85) rotate(-6deg)" },
          "60%": { transform: "scale(1.2) rotate(6deg)" },
          "80%": { transform: "scale(0.92) rotate(-3deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
        
        // ═══════════════════════════════════════
        // RIPPLE EFFECTS
        // ═══════════════════════════════════════
        "ripple-effect": {
          "0%": { transform: "scale(0)", opacity: "0.6" },
          "50%": { opacity: "0.3" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
        "ripple-effect-mobile": {
          "0%": { transform: "scale(0)", opacity: "0.7" },
          "50%": { opacity: "0.4" },
          "100%": { transform: "scale(3)", opacity: "0" },
        },
      },
      
      // ✅ Animation Classes
      animation: {
        // ═══════════════════════════════════════
        // FADE ANIMATIONS
        // ═══════════════════════════════════════
        "fade-in": "fade-in 0.3s ease-out",
        fadeIn: "fadeIn 0.2s ease-out",
        
        // ═══════════════════════════════════════
        // SCALE ANIMATIONS
        // ═══════════════════════════════════════
        scaleIn: "scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        
        // ═══════════════════════════════════════
        // SLIDE ANIMATIONS
        // ═══════════════════════════════════════
        slideUp: "slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        slideInUp: "slideInUp 0.3s ease-out",
        
        // ═══════════════════════════════════════
        // BOUNCE ANIMATIONS
        // ═══════════════════════════════════════
        "bounce-once": "bounce-once 0.8s ease-in-out",
        "bounce-dot": "bounce-dot 1.4s infinite ease-in-out both",
        
        // ═══════════════════════════════════════
        // PULSE ANIMATIONS
        // ═══════════════════════════════════════
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "profile-pulse": "profile-pulse 2s infinite",
        
        // ═══════════════════════════════════════
        // LIKE/DISLIKE ANIMATIONS - DESKTOP
        // ═══════════════════════════════════════
        "like-bounce": "like-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "dislike-bounce": "dislike-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        
        // ═══════════════════════════════════════
        // LIKE/DISLIKE ANIMATIONS - MOBILE
        // ═══════════════════════════════════════
        "like-bounce-mobile": "like-bounce-mobile 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "dislike-bounce-mobile": "dislike-bounce-mobile 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)",
        
        // ═══════════════════════════════════════
        // RIPPLE EFFECTS
        // ═══════════════════════════════════════
        "ripple-effect": "ripple-effect 0.6s ease-out",
        "ripple-effect-mobile": "ripple-effect-mobile 0.65s ease-out",
      },
    },
  },
  
  plugins: [],
  
  // ✅ IMPORTANT: Don't use global 'important' - can cause conflicts
  // Instead, use specific important utilities when needed (!bg-youtube-primary)
};

export default config;