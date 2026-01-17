/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/channel/[id]/index.tsx - ULTIMATE PREMIUM LUXURY VERSION 2026

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import ChannelHeader from "@/components/ChannelHeader";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getSocket, isSocketConnected } from "@/lib/socket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl } from "@/lib/imageUtils";
import {
  Calendar,
  Video,
  Upload,
  Play,
  Film,
  Grid,
  User,
  Sparkles,
  Crown,
  Gem,
  Star,
  Zap,
  Award,
  Diamond,
  Eye,
  TrendingUp,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { GetServerSideProps } from "next";

// ============================================================================
// ULTIMATE PREMIUM LUXURY STYLES - CSS-IN-JS (2026 Edition)
// ============================================================================
const premiumStyles = `
  /* ===== PREMIUM FONT IMPORTS ===== */
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800&display=swap');

  /* ===== CSS CUSTOM PROPERTIES - LUXURY COLOR PALETTE ===== */
  :root {
    /* Gold & Champagne */
    --luxury-gold: #D4AF37;
    --luxury-gold-light: #F4E4BA;
    --luxury-gold-dark: #A67C00;
    --luxury-champagne: #F7E7CE;
    
    /* Deep Blues & Royals */
    --luxury-royal: #1E3A5F;
    --luxury-navy: #0A1628;
    --luxury-sapphire: #0F52BA;
    --luxury-midnight: #191970;
    
    /* Rich Purples */
    --luxury-purple: #6B21A8;
    --luxury-violet: #7C3AED;
    --luxury-amethyst: #9333EA;
    
    /* Silvers & Platinums */
    --luxury-silver: #C0C0C0;
    --luxury-platinum: #E5E4E2;
    --luxury-pearl: #F8F6F0;
    
    /* Premium Blacks */
    --luxury-obsidian: #0B0B0B;
    --luxury-charcoal: #1A1A2E;
    --luxury-onyx: #353935;
    
    /* Accent Colors */
    --luxury-rose: #B76E79;
    --luxury-emerald: #046307;
    --luxury-ruby: #9B111E;
    
    /* Gradients */
    --gradient-gold: linear-gradient(135deg, #D4AF37 0%, #F4E4BA 50%, #D4AF37 100%);
    --gradient-royal: linear-gradient(135deg, #1E3A5F 0%, #0F52BA 50%, #1E3A5F 100%);
    --gradient-premium: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    --gradient-luxury: linear-gradient(135deg, #0A1628 0%, #1E3A5F 25%, #0F52BA 50%, #7C3AED 75%, #D4AF37 100%);
    
    /* Shadows */
    --shadow-luxury: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 60px rgba(212, 175, 55, 0.1);
    --shadow-gold: 0 20px 40px rgba(212, 175, 55, 0.2), 0 0 80px rgba(212, 175, 55, 0.1);
    --shadow-royal: 0 20px 40px rgba(15, 82, 186, 0.15), 0 0 80px rgba(15, 82, 186, 0.08);
  }

  /* ===== KEYFRAME ANIMATIONS ===== */
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    25% { transform: translateY(-5px) rotate(0.5deg); }
    50% { transform: translateY(-8px) rotate(0deg); }
    75% { transform: translateY(-5px) rotate(-0.5deg); }
  }
  
  @keyframes pulse-glow {
    0%, 100% { 
      box-shadow: 0 0 20px rgba(212, 175, 55, 0.3),
                  0 0 40px rgba(212, 175, 55, 0.1),
                  inset 0 0 20px rgba(212, 175, 55, 0.05);
    }
    50% { 
      box-shadow: 0 0 40px rgba(212, 175, 55, 0.5),
                  0 0 80px rgba(212, 175, 55, 0.2),
                  inset 0 0 30px rgba(212, 175, 55, 0.1);
    }
  }
  
  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  @keyframes border-dance {
    0%, 100% { border-color: rgba(212, 175, 55, 0.5); }
    25% { border-color: rgba(124, 58, 237, 0.5); }
    50% { border-color: rgba(15, 82, 186, 0.5); }
    75% { border-color: rgba(147, 51, 234, 0.5); }
  }
  
  @keyframes sparkle {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }
  
  @keyframes rotate-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes text-shine {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  
  @keyframes breathe {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.05); opacity: 1; }
  }
  
  @keyframes slide-up-fade {
    from { 
      opacity: 0; 
      transform: translateY(20px);
    }
    to { 
      opacity: 1; 
      transform: translateY(0);
    }
  }
  
  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }

  @keyframes luxury-border {
    0% { 
      border-image: linear-gradient(0deg, #D4AF37, #7C3AED, #0F52BA) 1;
    }
    33% { 
      border-image: linear-gradient(120deg, #7C3AED, #0F52BA, #D4AF37) 1;
    }
    66% { 
      border-image: linear-gradient(240deg, #0F52BA, #D4AF37, #7C3AED) 1;
    }
    100% { 
      border-image: linear-gradient(360deg, #D4AF37, #7C3AED, #0F52BA) 1;
    }
  }

  /* ===== PREMIUM UTILITY CLASSES ===== */
  .luxury-font-display {
    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  
  .luxury-font-body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-weight: 400;
    letter-spacing: -0.01em;
  }
  
  .luxury-font-accent {
    font-family: 'Outfit', 'Inter', sans-serif;
    font-weight: 500;
  }
  
  .premium-shimmer {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(212, 175, 55, 0.15) 25%,
      rgba(255, 255, 255, 0.25) 50%,
      rgba(212, 175, 55, 0.15) 75%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: shimmer 3s infinite;
  }
  
  .premium-float {
    animation: float 6s ease-in-out infinite;
  }
  
  .premium-glow {
    animation: pulse-glow 3s ease-in-out infinite;
  }
  
  .premium-gradient-bg {
    background: linear-gradient(-45deg, #1E3A5F, #0F52BA, #7C3AED, #D4AF37);
    background-size: 400% 400%;
    animation: gradient-shift 15s ease infinite;
  }
  
  .premium-border {
    animation: border-dance 6s ease-in-out infinite;
  }
  
  /* ===== GLASSMORPHISM ===== */
  .premium-glass {
    backdrop-filter: blur(20px) saturate(200%);
    -webkit-backdrop-filter: blur(20px) saturate(200%);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .premium-glass-gold {
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    background: linear-gradient(
      135deg,
      rgba(212, 175, 55, 0.08) 0%,
      rgba(255, 255, 255, 0.05) 50%,
      rgba(212, 175, 55, 0.08) 100%
    );
    border: 1px solid rgba(212, 175, 55, 0.2);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 0 40px rgba(212, 175, 55, 0.05);
  }
  
  .premium-glass-royal {
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    background: linear-gradient(
      135deg,
      rgba(15, 82, 186, 0.1) 0%,
      rgba(30, 58, 95, 0.15) 50%,
      rgba(124, 58, 237, 0.1) 100%
    );
    border: 1px solid rgba(15, 82, 186, 0.25);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  
  /* ===== PREMIUM CARDS ===== */
  .premium-card {
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.95) 0%,
      rgba(248, 246, 240, 0.98) 100%
    );
    border: 1px solid rgba(212, 175, 55, 0.15);
    box-shadow: 
      0 10px 40px rgba(0, 0, 0, 0.06),
      0 0 1px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
    transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  }
  
  .dark .premium-card {
    background: linear-gradient(
      145deg,
      rgba(26, 26, 46, 0.95) 0%,
      rgba(11, 11, 11, 0.98) 100%
    );
    border: 1px solid rgba(212, 175, 55, 0.2);
    box-shadow: 
      0 10px 40px rgba(0, 0, 0, 0.4),
      0 0 1px rgba(212, 175, 55, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }
  
  .premium-card:hover {
    transform: translateY(-4px);
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.1),
      0 0 2px rgba(212, 175, 55, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }
  
  .dark .premium-card:hover {
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.5),
      0 0 40px rgba(212, 175, 55, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }
  
  /* ===== PREMIUM TEXT GRADIENTS ===== */
  .premium-text-gradient {
    background: linear-gradient(
      135deg, 
      #D4AF37 0%, 
      #F4E4BA 25%, 
      #D4AF37 50%, 
      #A67C00 75%, 
      #D4AF37 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: text-shine 4s linear infinite;
  }
  
  .premium-text-royal {
    background: linear-gradient(
      135deg, 
      #1E3A5F 0%, 
      #0F52BA 30%, 
      #7C3AED 60%, 
      #D4AF37 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .premium-text-silver {
    background: linear-gradient(
      135deg, 
      #C0C0C0 0%, 
      #E5E4E2 25%, 
      #FFFFFF 50%, 
      #E5E4E2 75%, 
      #C0C0C0 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: text-shine 4s linear infinite;
  }
  
  /* ===== HOVER EFFECTS ===== */
  .premium-hover-lift {
    transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
    will-change: transform, box-shadow;
  }
  
  .premium-hover-lift:hover {
    transform: translateY(-12px) scale(1.02);
    box-shadow: 
      0 30px 60px rgba(0, 0, 0, 0.12),
      0 0 80px rgba(212, 175, 55, 0.08);
  }
  
  .dark .premium-hover-lift:hover {
    box-shadow: 
      0 30px 60px rgba(0, 0, 0, 0.4),
      0 0 80px rgba(212, 175, 55, 0.15);
  }
  
  /* ===== VIDEO CARD EFFECTS ===== */
  .premium-video-card {
    position: relative;
    overflow: hidden;
    border-radius: 20px;
  }
  
  .premium-video-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(212, 175, 55, 0.1),
      rgba(255, 255, 255, 0.2),
      rgba(212, 175, 55, 0.1),
      transparent
    );
    transition: left 0.7s cubic-bezier(0.23, 1, 0.32, 1);
    z-index: 10;
  }
  
  .premium-video-card:hover::before {
    left: 100%;
  }
  
  .premium-video-card::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    padding: 2px;
    background: linear-gradient(
      135deg,
      rgba(212, 175, 55, 0) 0%,
      rgba(212, 175, 55, 0.3) 50%,
      rgba(212, 175, 55, 0) 100%
    );
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.5s ease;
    pointer-events: none;
  }
  
  .premium-video-card:hover::after {
    opacity: 1;
  }
  
  /* ===== PREMIUM SCROLLBAR ===== */
  .premium-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .premium-scrollbar::-webkit-scrollbar-track {
    background: linear-gradient(
      180deg,
      rgba(212, 175, 55, 0.05) 0%,
      rgba(124, 58, 237, 0.05) 100%
    );
    border-radius: 4px;
  }
  
  .premium-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(
      180deg,
      #D4AF37 0%,
      #A67C00 50%,
      #D4AF37 100%
    );
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  
  .premium-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(
      180deg,
      #F4E4BA 0%,
      #D4AF37 50%,
      #F4E4BA 100%
    );
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  
  /* ===== PREMIUM BUTTONS ===== */
  .premium-button-gold {
    position: relative;
    background: linear-gradient(135deg, #D4AF37 0%, #F4E4BA 50%, #D4AF37 100%);
    color: #0A1628;
    font-weight: 600;
    border: none;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  }
  
  .premium-button-gold::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    transition: left 0.5s;
  }
  
  .premium-button-gold:hover::before {
    left: 100%;
  }
  
  .premium-button-gold:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(212, 175, 55, 0.4);
  }
  
  .premium-button-royal {
    position: relative;
    background: linear-gradient(135deg, #1E3A5F 0%, #0F52BA 50%, #7C3AED 100%);
    color: white;
    font-weight: 600;
    border: none;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  }
  
  .premium-button-royal::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.5s;
  }
  
  .premium-button-royal:hover::before {
    left: 100%;
  }
  
  .premium-button-royal:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(15, 82, 186, 0.4);
  }
  
  /* ===== BADGE STYLES ===== */
  .premium-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    transition: all 0.3s ease;
  }
  
  .premium-badge-gold {
    background: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(244, 228, 186, 0.2) 100%);
    color: #A67C00;
    border: 1px solid rgba(212, 175, 55, 0.3);
  }
  
  .dark .premium-badge-gold {
    background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(244, 228, 186, 0.1) 100%);
    color: #F4E4BA;
    border: 1px solid rgba(212, 175, 55, 0.4);
  }
  
  .premium-badge-royal {
    background: linear-gradient(135deg, rgba(15, 82, 186, 0.15) 0%, rgba(124, 58, 237, 0.1) 100%);
    color: #0F52BA;
    border: 1px solid rgba(15, 82, 186, 0.3);
  }
  
  .dark .premium-badge-royal {
    background: linear-gradient(135deg, rgba(15, 82, 186, 0.25) 0%, rgba(124, 58, 237, 0.15) 100%);
    color: #93C5FD;
    border: 1px solid rgba(15, 82, 186, 0.4);
  }
  
  /* ===== ENTRANCE ANIMATIONS ===== */
  .animate-slide-up {
    animation: slide-up-fade 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  }
  
  .animate-delay-100 { animation-delay: 100ms; }
  .animate-delay-200 { animation-delay: 200ms; }
  .animate-delay-300 { animation-delay: 300ms; }
  .animate-delay-400 { animation-delay: 400ms; }
  .animate-delay-500 { animation-delay: 500ms; }
  
  /* ===== RESPONSIVE ADJUSTMENTS ===== */
  @media (max-width: 768px) {
    .premium-hover-lift:hover {
      transform: translateY(-6px) scale(1.01);
    }
    
    .luxury-font-display {
      letter-spacing: -0.01em;
    }
  }
  
  /* ===== FOCUS STATES FOR ACCESSIBILITY ===== */
  .premium-focus:focus {
    outline: 2px solid rgba(212, 175, 55, 0.5);
    outline-offset: 2px;
  }
  
  .premium-focus:focus:not(:focus-visible) {
    outline: none;
  }
  
  .premium-focus:focus-visible {
    outline: 2px solid rgba(212, 175, 55, 0.8);
    outline-offset: 2px;
  }
`;

// ============================================================================
// THUMBNAIL HELPER - FIXED VERSION
// ============================================================================
const getShortThumbnail = (short: any): string => {
  const thumbnailCandidates = [
    short.thumbnailUrl,
    short.thumbnail,
    short.videothumbnail,
    short.videothumb,
  ];

  for (const thumb of thumbnailCandidates) {
    if (thumb && typeof thumb === "string" && thumb.startsWith("http")) {
      if (thumb.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)) {
        console.log("✅ Using complete thumbnail URL");
        return thumb;
      }
    }
  }

  if (
    short.videoUrl &&
    typeof short.videoUrl === "string" &&
    short.videoUrl.startsWith("http")
  ) {
    if (short.videoUrl.match(/\.(mp4|webm|mov|avi)(\?|$)/i)) {
      console.log("📦 Using video URL for thumbnail");
      return short.videoUrl;
    }
  }

  console.warn("⚠️ No valid media URL for short:", short._id);
  return "fallback";
};

// ============================================================================
// MAIN COMPONENT - STATE & REFS
// ============================================================================

const ChannelPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, updateUser } = useUser();

  const infoBarRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);

  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [shorts, setShorts] = useState<any[]>([]);
  const [shortsLoading, setShortsLoading] = useState(false);
  const [shortsError, setShortsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "shorts">("videos");
  const [contentTab, setContentTab] = useState<"videos" | "shorts">("videos");
  const [refreshKey, setRefreshKey] = useState(0);
  const [renderKey, setRenderKey] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // ============================================================================
  // LIFECYCLE HOOKS - CLIENT MOUNTING & VISIBILITY
  // ============================================================================

  useEffect(() => {
    isMountedRef.current = true;
    setIsMounted(true);
    console.log("✅ Component Mounted");
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (channel && isMountedRef.current && infoBarRef.current) {
      const checkVisibility = () => {
        if (!infoBarRef.current) return;

        const rect = infoBarRef.current.getBoundingClientRect();
        console.log("📏 Info bar:", {
          height: rect.height,
          width: rect.width,
          top: rect.top,
        });

        if (rect.height === 0) {
          console.warn("⚠️ Info bar hidden! Forcing re-render...");
          infoBarRef.current.style.display = "block";
          infoBarRef.current.style.minHeight = "80px";
          infoBarRef.current.style.visibility = "visible";
          infoBarRef.current.style.opacity = "1";
          setRenderKey((prev) => prev + 1);
        }
      };

      checkVisibility();
      const timer = setTimeout(checkVisibility, 200);
      return () => clearTimeout(timer);
    }
  }, [channel?._id, videos.length, shorts.length]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("🔍 CHANNEL PAGE DEBUG:", {
        channelLoaded: !!channel,
        channelId: channel?._id,
        channelName: channel?.channelname || channel?.name,
        videosCount: videos.length,
        shortsCount: shorts.length,
        isMounted,
        renderKey,
        timestamp: new Date().toISOString(),
      });

      (window as any).__debugChannelPage = {
        channel,
        videos,
        shorts,
        isMounted,
        renderKey,
      };
    }
  }, [channel, videos.length, shorts.length, isMounted, renderKey]);

  useEffect(() => {
    const handleForceRefresh = (event: CustomEvent) => {
      console.log("🔄 Force refresh event received:", event.detail);
      setRefreshKey((prev) => prev + 1);
      setRenderKey((prev) => prev + 1);
    };

    window.addEventListener(
      "forceChannelRefresh",
      handleForceRefresh as EventListener,
    );

    return () => {
      window.removeEventListener(
        "forceChannelRefresh",
        handleForceRefresh as EventListener,
      );
    };
  }, []);

  // ============================================================================
  // FETCH CHANNEL DATA
  // ============================================================================

  useEffect(() => {
    const fetchChannel = async () => {
      if (!id || typeof id !== "string") return;

      try {
        setLoading(true);
        console.log("📡 Fetching channel:", id);

        const response = await axiosInstance.get(`/auth/channel/${id}`);

        if (response.data.success && response.data.user) {
          const channelData = response.data.user;

          if (typeof channelData.subscribers !== "number") {
            channelData.subscribers = 0;
          }

          setChannel(channelData);
          console.log("✅ Channel loaded:", channelData.channelname);

          if (user && user._id === id) {
            const updatedUser = {
              ...user,
              image: channelData.image || user.image,
              bannerImage: channelData.bannerImage || user.bannerImage,
              channelname: channelData.channelname || user.channelname,
              description: channelData.description || user.description,
              subscribers: channelData.subscribers,
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            updateUser(updatedUser);
          }
        } else {
          setChannel(null);
        }
      } catch (error: any) {
        console.error("❌ Channel fetch error:", error);
        setChannel(null);
      } finally {
        setLoading(false);
      }
    };

    fetchChannel();
  }, [id, user?._id]);

  // ============================================================================
  // FETCH VIDEOS
  // ============================================================================

  useEffect(() => {
    const fetchVideos = async () => {
      if (!id || typeof id !== "string") {
        console.log("⚠️ No channel ID for videos");
        return;
      }

      try {
        setVideosLoading(true);
        console.log("📹 Fetching videos for channel:", id);

        const timestamp = Date.now();

        const response = await axiosInstance.get(`/video/channel/${id}`, {
          params: {
            _t: timestamp,
            nocache: "true",
            mobile: "true",
          },
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
          transformRequest: [
            (data, headers) => {
              delete headers["If-None-Match"];
              delete headers["If-Modified-Since"];
              return data;
            },
          ],
        });

        console.log("📹 Videos API response:", {
          success: response.data.success,
          count:
            response.data.data?.length || response.data.videos?.length || 0,
          timestamp: response.data.timestamp,
        });

        if (response.data.success && Array.isArray(response.data.data)) {
          console.log("✅ Setting videos:", response.data.data.length);
          setVideos(response.data.data);
          setTimeout(() => setRenderKey((prev) => prev + 1), 100);
        } else if (
          response.data.videos &&
          Array.isArray(response.data.videos)
        ) {
          console.log(
            "✅ Setting videos (alternate):",
            response.data.videos.length,
          );
          setVideos(response.data.videos);
          setTimeout(() => setRenderKey((prev) => prev + 1), 100);
        } else {
          console.log("⚠️ No videos in response");
          setVideos([]);
        }
      } catch (error: any) {
        console.error("❌ Error fetching videos:", {
          message: error.message,
          status: error.response?.status,
        });
        setVideos([]);
      } finally {
        setVideosLoading(false);
      }
    };

    const timer = setTimeout(fetchVideos, 150);
    return () => clearTimeout(timer);
  }, [id, refreshKey]);

  // ============================================================================
  // FETCH SHORTS
  // ============================================================================

  useEffect(() => {
    const fetchShorts = async () => {
      if (!id || typeof id !== "string") {
        console.log("⚠️ No channel ID for shorts");
        return;
      }

      try {
        setShortsLoading(true);
        setShortsError(null);
        console.log("🎬 Fetching shorts for channel:", id);

        const timestamp = Date.now();

        const response = await axiosInstance.get(`/shorts/channel/${id}`, {
          params: {
            page: 1,
            limit: 100,
            _t: timestamp,
            nocache: "true",
            mobile: "true",
          },
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
          transformRequest: [
            (data, headers) => {
              delete headers["If-None-Match"];
              delete headers["If-Modified-Since"];
              return data;
            },
          ],
        });

        console.log("🎬 Shorts API response:", {
          success: response.data.success,
          count:
            response.data.data?.length || response.data.shorts?.length || 0,
          timestamp: response.data.timestamp,
        });

        if (response.data.success) {
          const fetchedShorts =
            response.data.data || response.data.shorts || [];
          console.log("✅ Setting shorts:", fetchedShorts.length);

          const processedShorts = fetchedShorts.map((short: any) => {
            console.log("🎬 SHORT DATA:", {
              id: short._id,
              title: short.title,
              thumbnailUrl: short.thumbnailUrl,
              thumbnail: short.thumbnail,
              videoUrl: short.videoUrl,
              video: short.video,
              allFields: Object.keys(short)
                .filter(
                  (k) =>
                    k.toLowerCase().includes("url") ||
                    k.toLowerCase().includes("video") ||
                    k.toLowerCase().includes("thumb"),
                )
                .reduce((acc, k) => ({ ...acc, [k]: short[k] }), {}),
            });

            return {
              ...short,
              thumbnailUrl:
                short.thumbnailUrl ||
                short.thumbnail ||
                short.thumbnailPath ||
                short.thumb,
              videoUrl:
                short.videoUrl ||
                short.video ||
                short.videoPath ||
                short.filepath,
            };
          });

          setShorts(processedShorts);
          setTimeout(() => setRenderKey((prev) => prev + 1), 100);
        } else {
          console.log("⚠️ No shorts in response");
          setShorts([]);
        }
      } catch (error: any) {
        console.error("❌ Error fetching shorts:", {
          message: error.message,
          status: error.response?.status,
        });

        if (error.response?.status !== 404) {
          setShortsError("Failed to load shorts");
        }
        setShorts([]);
      } finally {
        setShortsLoading(false);
      }
    };

    const timer = setTimeout(fetchShorts, 200);
    return () => clearTimeout(timer);
  }, [id, refreshKey]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleVideoUploadSuccess = (newVideo: any) => {
    console.log("✅ Video upload success:", newVideo._id);
    setVideos((prevVideos) => [newVideo, ...prevVideos]);
  };

  const handleStartCall = async () => {
    if (!user) {
      setCallError("Please login to make calls");
      setTimeout(() => setCallError(null), 3000);
      return;
    }

    if (!id || typeof id !== "string") {
      setCallError("Invalid channel ID");
      setTimeout(() => setCallError(null), 3000);
      return;
    }

    if (user._id === id) {
      setCallError("You cannot call yourself!");
      setTimeout(() => setCallError(null), 3000);
      return;
    }

    if (!channel) {
      setCallError("Channel data not loaded");
      setTimeout(() => setCallError(null), 3000);
      return;
    }

    try {
      setIsInitiatingCall(true);
      setCallError(null);

      const remotePersonName =
        channel.name || channel.channelname || "Unknown User";
      const remotePersonImage =
        channel.image || "https://github.com/shadcn.png";

      const response = await axiosInstance.post("/call/initiate", {
        receiverId: id,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to initiate call");
      }

      const { call } = response.data;

      if (!isSocketConnected()) {
        throw new Error("Socket not connected. Please refresh the page.");
      }

      const socket = getSocket();
      socket.emit("call-user", {
        userToCall: id,
        from: user._id,
        name: user.name || user.channelname || "User",
        image: user.image || "",
        roomId: call.roomId,
        callId: call._id,
      });

      router.push({
        pathname: `/call/${call.roomId}`,
        query: {
          callId: call._id,
          remoteName: remotePersonName,
          remoteImage: remotePersonImage,
          initiator: "true",
        },
      });
    } catch (error: any) {
      setCallError(
        error.response?.data?.message ||
          error.message ||
          "Failed to initiate call. Please try again.",
      );
      setTimeout(() => setCallError(null), 5000);
    } finally {
      setIsInitiatingCall(false);
    }
  };

  // ============================================================================
  // LOADING STATE - PREMIUM LUXURY STYLED
  // ============================================================================

  if (loading) {
    return (
      <>
        <style jsx global>
          {premiumStyles}
        </style>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-purple-50/30 dark:from-gray-950 dark:via-purple-950/10 dark:to-gray-900">
          {/* Decorative Background Orbs */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-amber-200/20 to-purple-200/20 dark:from-amber-500/5 dark:to-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
            <div
              className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-blue-200/20 to-amber-200/20 dark:from-blue-500/5 dark:to-amber-500/5 rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "1s" }}
            ></div>
          </div>

          <div className="text-center relative z-10">
            {/* Premium Loading Spinner */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              {/* Outer Ring */}
              <div className="absolute inset-0 rounded-full border-4 border-amber-200/50 dark:border-amber-700/30"></div>

              {/* Animated Gold Ring */}
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 dark:border-t-amber-400 animate-spin"
                style={{ animationDuration: "1.5s" }}
              ></div>

              {/* Inner Rotating Ring */}
              <div
                className="absolute inset-3 rounded-full border-4 border-transparent border-t-purple-500 dark:border-t-purple-400 animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "2s",
                }}
              ></div>

              {/* Center Icon */}
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 dark:from-amber-500 dark:via-amber-600 dark:to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
                <Crown className="w-8 h-8 text-white drop-shadow-lg" />
              </div>

              {/* Sparkle Effects */}
              <div className="absolute -top-2 -right-2 animate-ping">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div
                className="absolute -bottom-2 -left-2 animate-ping"
                style={{ animationDelay: "0.5s" }}
              >
                <Star className="w-3 h-3 text-purple-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold luxury-font-display mb-2 premium-text-gradient">
              Loading Channel
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 luxury-font-body tracking-wide">
              Preparing your premium experience...
            </p>
          </div>
        </div>
      </>
    );
  }

  // ============================================================================
  // NOT FOUND STATE - PREMIUM LUXURY STYLED
  // ============================================================================

  if (!channel) {
    return (
      <>
        <style jsx global>
          {premiumStyles}
        </style>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-purple-50/30 dark:from-gray-950 dark:via-purple-950/10 dark:to-gray-900">
          <div className="text-center p-8 max-w-md">
            {/* Premium Icon Container */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 opacity-50"></div>
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center shadow-inner">
                <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
              <div
                className="absolute -inset-1 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 animate-spin"
                style={{ animationDuration: "20s" }}
              ></div>
            </div>

            <h2 className="text-3xl font-bold luxury-font-display mb-3 bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
              Channel Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 luxury-font-body leading-relaxed">
              This channel doesn't exist or has been removed. Explore other
              premium content instead.
            </p>

            <button
              onClick={() => router.push("/")}
              className="group relative px-10 py-4 premium-button-gold rounded-2xl font-semibold luxury-font-accent overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Diamond className="w-5 h-5" />
                Explore Home
              </span>
            </button>
          </div>
        </div>
      </>
    );
  }

  const isOwnChannel = user?._id === id;

  const getShortVideoUrl = (short: any): string => {
    if (!short?.videoUrl) return "";
    if (short.videoUrl.startsWith("http")) {
      return short.videoUrl;
    }
    return short.videoUrl;
  };

  // ============================================================================
  // RENDER - PREMIUM LUXURY MAIN JSX
  // ============================================================================
  return (
    <ProtectedRoute requireAuth={true}>
      <style jsx global>
        {premiumStyles}
      </style>

      {/* Premium Background with Luxury Gradient */}
      <div className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-purple-50/20 dark:from-gray-950 dark:via-amber-950/5 dark:to-gray-900 premium-scrollbar">
        {/* Decorative Background Elements - Luxury Edition */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Gold Orb - Top Left */}
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-amber-300/10 to-transparent dark:from-amber-500/5 rounded-full blur-3xl"></div>

          {/* Purple Orb - Bottom Right */}
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-purple-300/10 to-transparent dark:from-purple-500/5 rounded-full blur-3xl"></div>

          {/* Blue Orb - Center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-200/5 via-transparent to-amber-200/5 dark:from-blue-500/3 dark:to-amber-500/3 rounded-full blur-3xl"></div>

          {/* Subtle Grid Pattern Overlay */}
          <div
            className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(212, 175, 55, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.5) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          ></div>
        </div>

        <div className="relative w-full z-10">
          {/* Channel Header */}
          <ChannelHeader
            channel={channel}
            user={user}
            onStartCall={handleStartCall}
            isInitiatingCall={isInitiatingCall}
            callError={callError}
            onAvatarUpdate={() => setRefreshKey((prev) => prev + 1)}
          />

          {/* ✅ PREMIUM LUXURY CHANNEL INFO BAR */}
          {channel && isMounted && (
            <div
              ref={infoBarRef}
              key={`info-${channel._id}-${videos.length}-${shorts.length}-${renderKey}`}
              className="w-full relative z-10"
              style={{ marginBottom: "32px" }}
            >
              {/* Premium Glass Effect Background */}
              <div className="absolute inset-0 premium-glass-gold z-0"></div>

              {/* Luxury Gradient Accent Line - Top */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 dark:via-amber-500/60 to-transparent z-[1]"></div>

              {/* Luxury Gradient Accent Line - Bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 dark:via-amber-500/40 to-transparent z-[1]"></div>

              <div className="relative px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-7xl mx-auto z-[2]">
                <div
                  className="flex items-center overflow-x-auto scrollbar-hide premium-scrollbar"
                  style={{ gap: "20px" }}
                >
                  {/* Channel Name - Premium Crown Badge */}
                  <div
                    className="flex items-center premium-glass-royal rounded-2xl px-5 py-3 shadow-lg hover:shadow-xl transition-all duration-500 group"
                    style={{ gap: "12px", flexShrink: 0 }}
                  >
                    <div
                      className="rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-500"
                      style={{
                        width: "40px",
                        height: "40px",
                        minWidth: "40px",
                      }}
                    >
                      <Crown
                        style={{
                          width: "20px",
                          height: "20px",
                          color: "white",
                        }}
                      />
                    </div>
                    <span
                      className="font-bold luxury-font-display premium-text-gradient"
                      style={{ fontSize: "16px", whiteSpace: "nowrap" }}
                    >
                      {channel.channelname || channel.name || "Unknown"}
                    </span>
                  </div>

                  {/* Joined Date - Premium Style */}
                  <div
                    className="flex items-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl px-5 py-3 border border-emerald-200/50 dark:border-emerald-500/30 shadow-sm hover:shadow-lg hover:border-emerald-300/70 dark:hover:border-emerald-400/50 transition-all duration-500 group"
                    style={{ gap: "10px", flexShrink: 0 }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                      <Calendar
                        className="text-white"
                        style={{
                          width: "18px",
                          height: "18px",
                        }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold luxury-font-accent">
                        Member Since
                      </span>
                      <span
                        className="text-gray-800 dark:text-gray-200 font-semibold luxury-font-body"
                        style={{ fontSize: "13px", whiteSpace: "nowrap" }}
                      >
                        {channel.joinedon
                          ? new Date(channel.joinedon).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "Recently"}
                      </span>
                    </div>
                  </div>

                  {/* Video Count - Premium Animated */}
                  <div
                    key={`video-${videos.length}-${renderKey}`}
                    className="flex items-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl px-5 py-3 border border-blue-200/50 dark:border-blue-500/30 shadow-sm hover:shadow-lg hover:border-blue-300/70 dark:hover:border-blue-400/50 transition-all duration-500 group"
                    style={{
                      gap: "12px",
                      flexShrink: 0,
                      minWidth: "fit-content",
                    }}
                  >
                    <div
                      className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-110 transition-transform duration-500"
                      style={{
                        width: "40px",
                        height: "40px",
                        minWidth: "40px",
                        flexShrink: 0,
                      }}
                    >
                      <Video
                        className="text-white"
                        style={{ width: "18px", height: "18px" }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span
                        className="font-black text-gray-900 dark:text-white luxury-font-display"
                        style={{
                          fontSize: "18px",
                          whiteSpace: "nowrap",
                          lineHeight: "1.1",
                        }}
                      >
                        {videos.length.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold luxury-font-accent">
                        {videos.length === 1 ? "Video" : "Videos"}
                      </span>
                    </div>
                  </div>

                  {/* Shorts Count - Premium Animated */}
                  <div
                    key={`shorts-${shorts.length}-${renderKey}`}
                    className="flex items-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl px-5 py-3 border border-rose-200/50 dark:border-rose-500/30 shadow-sm hover:shadow-lg hover:border-rose-300/70 dark:hover:border-rose-400/50 transition-all duration-500 group"
                    style={{
                      gap: "12px",
                      flexShrink: 0,
                      minWidth: "fit-content",
                    }}
                  >
                    <div
                      className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md shadow-rose-500/25 group-hover:scale-110 transition-transform duration-500"
                      style={{
                        width: "40px",
                        height: "40px",
                        minWidth: "40px",
                        flexShrink: 0,
                      }}
                    >
                      <Film
                        className="text-white"
                        style={{ width: "18px", height: "18px" }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span
                        className="font-black text-gray-900 dark:text-white luxury-font-display"
                        style={{
                          fontSize: "18px",
                          whiteSpace: "nowrap",
                          lineHeight: "1.1",
                        }}
                      >
                        {shorts.length.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold luxury-font-accent">
                        {shorts.length === 1 ? "Short" : "Shorts"}
                      </span>
                    </div>
                  </div>

                  {/* Views Badge - NEW LUXURY ADDITION */}
                  <div
                    className="flex items-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl px-5 py-3 border border-amber-200/50 dark:border-amber-500/30 shadow-sm hover:shadow-lg hover:border-amber-300/70 dark:hover:border-amber-400/50 transition-all duration-500 group"
                    style={{
                      gap: "12px",
                      flexShrink: 0,
                      minWidth: "fit-content",
                    }}
                  >
                    <div
                      className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:scale-110 transition-transform duration-500"
                      style={{
                        width: "40px",
                        height: "40px",
                        minWidth: "40px",
                        flexShrink: 0,
                      }}
                    >
                      <Eye
                        className="text-white"
                        style={{ width: "18px", height: "18px" }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span
                        className="font-black text-gray-900 dark:text-white luxury-font-display"
                        style={{
                          fontSize: "18px",
                          whiteSpace: "nowrap",
                          lineHeight: "1.1",
                        }}
                      >
                        {(
                          videos.reduce((acc, v) => acc + (v.views || 0), 0) +
                          shorts.reduce((acc, s) => acc + (s.views || 0), 0)
                        ).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold luxury-font-accent">
                        Total Views
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ DEBUG: Force Refresh Button (remove after testing) */}
          {process.env.NODE_ENV === "development" && (
            <div className="px-4 py-2 bg-gradient-to-r from-amber-100 to-purple-100 dark:from-amber-900/30 dark:to-purple-900/30 text-center border-y border-amber-200 dark:border-amber-800">
              <button
                onClick={() => {
                  console.log("🔄 Force refresh triggered");
                  setRefreshKey((prev) => prev + 1);
                  setRenderKey((prev) => prev + 1);
                }}
                className="px-6 py-2 premium-button-gold rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all luxury-font-accent"
              >
                Force Refresh (Debug)
              </button>
              <span className="ml-4 text-xs text-amber-700 dark:text-amber-300 luxury-font-body">
                Videos: {videos.length} | Shorts: {shorts.length} | Render:{" "}
                {renderKey}
              </span>
            </div>
          )}

          {/* ============================================================================
              PREMIUM LUXURY UPLOAD SECTION - OWN CHANNEL ONLY
              ============================================================================ */}
          {isOwnChannel && (
            <div
              className="px-4 sm:px-6 lg:px-8 pb-8 sm:pb-10 pt-0 max-w-7xl mx-auto"
              style={{ position: "relative", zIndex: 5 }}
            >
              {/* Premium Card Container with Animated Border */}
              <div className="relative overflow-hidden rounded-3xl">
                {/* Animated Gradient Border */}
                <div
                  className="absolute inset-0 rounded-3xl p-[2px]"
                  style={{
                    background:
                      "linear-gradient(90deg, #D4AF37, #7C3AED, #0F52BA, #D4AF37)",
                    backgroundSize: "300% 100%",
                    animation: "gradient-shift 6s linear infinite",
                  }}
                >
                  <div className="absolute inset-[2px] rounded-3xl bg-white dark:bg-gray-900"></div>
                </div>

                {/* Inner Card */}
                <div className="relative bg-white/95 dark:bg-gray-900/98 backdrop-blur-xl rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl">
                  {/* Premium Creator Studio Header Badge */}
                  <div className="flex items-center justify-center mb-8">
                    <div className="flex items-center gap-3 px-6 py-3 premium-glass-gold rounded-full shadow-lg">
                      <div className="relative">
                        <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                      </div>
                      <span className="text-base font-bold luxury-font-display premium-text-gradient tracking-wide">
                        Creator Studio
                      </span>
                      <div className="relative">
                        <Crown className="w-5 h-5 text-amber-500" />
                        <div className="absolute inset-0 animate-ping">
                          <Crown className="w-5 h-5 text-amber-400 opacity-50" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Upload Tabs - Premium Luxury Styled */}
                  <div className="flex items-center gap-3 mb-8 p-2 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl overflow-x-auto scrollbar-hide">
                    {/* Videos Upload Tab */}
                    <button
                      type="button"
                      onClick={() => setActiveTab("videos")}
                      className={`
                        flex items-center gap-3 
                        px-6 sm:px-8 md:px-10 
                        py-4 sm:py-5 
                        rounded-xl
                        transition-all duration-500 relative 
                        whitespace-nowrap flex-1 justify-center
                        font-bold text-sm sm:text-base
                        luxury-font-accent
                        overflow-hidden
                        ${
                          activeTab === "videos"
                            ? "bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-gray-700/70"
                        }
                      `}
                    >
                      {activeTab === "videos" && (
                        <div className="absolute inset-0 premium-shimmer"></div>
                      )}
                      <Video className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 relative z-10" />
                      <span className="relative z-10">Upload Videos</span>
                    </button>

                    {/* Shorts Upload Tab */}
                    <button
                      type="button"
                      onClick={() => setActiveTab("shorts")}
                      className={`
                        flex items-center gap-3 
                        px-6 sm:px-8 md:px-10 
                        py-4 sm:py-5 
                        rounded-xl
                        transition-all duration-500 relative 
                        whitespace-nowrap flex-1 justify-center
                        font-bold text-sm sm:text-base
                        luxury-font-accent
                        overflow-hidden
                        ${
                          activeTab === "shorts"
                            ? "bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white shadow-xl shadow-rose-500/30"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-gray-700/70"
                        }
                      `}
                    >
                      {activeTab === "shorts" && (
                        <div className="absolute inset-0 premium-shimmer"></div>
                      )}
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 relative z-10" />
                      <span className="relative z-10">Upload Shorts</span>
                    </button>
                  </div>

                  {/* Tab Content */}
                  {activeTab === "videos" ? (
                    <div>
                      <VideoUploader
                        channelId={id as string}
                        channelName={channel?.channelname || channel?.name}
                        onUploadSuccess={handleVideoUploadSuccess}
                      />
                    </div>
                  ) : (
                    <div>
                      {/* Channel Info Badge - Premium */}
                      <div className="flex items-center gap-4 mb-6 p-5 premium-glass-royal rounded-2xl">
                        <div className="relative">
                          <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full blur opacity-40"></div>
                          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-rose-500/50 shadow-lg">
                            <Avatar className="w-full h-full">
                              <AvatarImage
                                src={getImageUrl(channel?.image, true)}
                                alt={channel?.channelname || channel?.name}
                                className="w-full h-full object-cover"
                              />
                              <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-600 text-white font-bold text-lg luxury-font-display">
                                {(channel?.channelname ||
                                  channel?.name ||
                                  "C")[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-base text-gray-900 dark:text-white luxury-font-display">
                            {channel?.channelname || channel?.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 luxury-font-body">
                            <Star
                              className="w-3.5 h-3.5 text-amber-500"
                              fill="currentColor"
                            />
                            Uploading as this channel
                          </p>
                        </div>
                      </div>

                      {/* Shorts Upload CTA - Premium Luxury */}
                      <div className="text-center py-12 sm:py-16">
                        <div className="relative inline-block">
                          {/* Animated Glow Ring */}
                          <div className="absolute -inset-8 bg-gradient-to-r from-rose-500/10 via-pink-500/20 to-rose-500/10 rounded-full blur-2xl animate-pulse"></div>

                          <div className="relative premium-glass-royal rounded-3xl p-10 sm:p-14 max-w-lg border border-rose-200/30 dark:border-rose-500/20">
                            {/* Premium Icon */}
                            <div className="relative mb-8">
                              <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-2xl animate-pulse"></div>
                              <div className="relative bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/40">
                                <Play
                                  className="w-12 h-12 sm:w-14 sm:h-14 text-white ml-1"
                                  fill="currentColor"
                                />
                              </div>
                              {/* Sparkle Effects */}
                              <div className="absolute -top-2 -right-2">
                                <Sparkles className="w-6 h-6 text-rose-400 animate-pulse" />
                              </div>
                              <div className="absolute -bottom-1 -left-1">
                                <Gem
                                  className="w-5 h-5 text-pink-400 animate-pulse"
                                  style={{ animationDelay: "0.5s" }}
                                />
                              </div>
                            </div>

                            <h3 className="text-2xl sm:text-3xl font-black luxury-font-display bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-3">
                              Upload Shorts
                            </h3>
                            <p className="text-base text-gray-600 dark:text-gray-400 mb-10 luxury-font-body leading-relaxed">
                              Create engaging vertical videos (9:16) and connect
                              with your audience
                            </p>

                            <button
                              onClick={() => router.push("/shorts/upload")}
                              className="group relative bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:via-pink-600 hover:to-rose-700 px-10 py-5 text-white rounded-2xl font-bold transition-all duration-500 flex items-center gap-3 mx-auto shadow-xl shadow-rose-500/30 hover:shadow-2xl hover:shadow-rose-500/50 hover:scale-105 overflow-hidden luxury-font-accent text-lg"
                            >
                              <div className="absolute inset-0 premium-shimmer"></div>
                              <Upload className="w-6 h-6 group-hover:-translate-y-1 transition-transform duration-300 relative z-10" />
                              <span className="relative z-10">
                                Go to Shorts Upload
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================================
              PREMIUM LUXURY CONTENT TABS - VIEW VIDEOS & SHORTS
              ============================================================================ */}
          <div className="w-full pb-32 sm:pb-12 overflow-hidden">
            <div className="w-full sm:px-6 lg:px-8 sm:max-w-7xl sm:mx-auto">
              {/* Premium Tab Navigation */}
              <div className="w-full mb-10">
                <div className="relative">
                  {/* Glass Background Effect */}
                  <div className="absolute inset-0 premium-glass rounded-2xl sm:rounded-3xl z-0"></div>

                  <div className="relative flex items-center gap-3 p-3 overflow-x-auto scrollbar-hide px-4 sm:px-3 z-[1]">
                    {/* Videos Tab - Premium Luxury */}
                    <button
                      onClick={() => setContentTab("videos")}
                      className={`
                        flex items-center gap-3 sm:gap-4 px-6 sm:px-10 py-4 sm:py-5
                        font-bold text-sm sm:text-base
                        transition-all duration-500 whitespace-nowrap
                        rounded-xl sm:rounded-2xl
                        luxury-font-accent
                        relative overflow-hidden
                        ${
                          contentTab === "videos"
                            ? "bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-gray-800/60"
                        }
                      `}
                    >
                      {contentTab === "videos" && (
                        <div className="absolute inset-0 premium-shimmer"></div>
                      )}
                      <Grid className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                      <span className="relative z-10">Videos</span>
                      <span
                        className={`
                          text-xs font-black px-3 py-1.5 rounded-full relative z-10
                          ${
                            contentTab === "videos"
                              ? "bg-white/20 text-white"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }
                        `}
                      >
                        {videos.length}
                      </span>
                    </button>

                    {/* Shorts Tab - Premium Luxury */}
                    <button
                      onClick={() => setContentTab("shorts")}
                      className={`
                        flex items-center gap-3 sm:gap-4 px-6 sm:px-10 py-4 sm:py-5
                        font-bold text-sm sm:text-base
                        transition-all duration-500 whitespace-nowrap
                        rounded-xl sm:rounded-2xl
                        luxury-font-accent
                        relative overflow-hidden
                        ${
                          contentTab === "shorts"
                            ? "bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white shadow-xl shadow-rose-500/30"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-gray-800/60"
                        }
                      `}
                    >
                      {contentTab === "shorts" && (
                        <div className="absolute inset-0 premium-shimmer"></div>
                      )}
                      <Film className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                      <span className="relative z-10">Shorts</span>
                      <span
                        className={`
                          text-xs font-black px-3 py-1.5 rounded-full relative z-10
                          ${
                            contentTab === "shorts"
                              ? "bg-white/20 text-white"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }
                        `}
                      >
                        {shorts.length}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Videos Content - Premium Luxury Styled */}
              {contentTab === "videos" && (
                <div className="w-full px-3 sm:px-0">
                  {videosLoading ? (
                    <div className="text-center py-20">
                      <div className="relative w-24 h-24 mx-auto mb-8">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900/50"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
                        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                          <Video className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-semibold luxury-font-body">
                        Loading your content...
                      </p>
                    </div>
                  ) : videos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 lg:gap-8">
                      {videos.map((video, index) => {
                        const getVideoThumbnail = (video: any): string => {
                          const explicitThumbnail =
                            video?.thumbnailUrl ||
                            video?.thumbnail ||
                            video?.videothumbnail ||
                            video?.videothumb;

                          if (explicitThumbnail?.startsWith("http")) {
                            return explicitThumbnail;
                          }

                          const videoUrl =
                            video?.filepath ||
                            video?.videofile ||
                            video?.videoLink;
                          if (videoUrl?.includes("supabase.co")) {
                            return videoUrl;
                          }

                          if (
                            videoUrl?.includes("cloudinary.com") &&
                            videoUrl.includes("/video/upload/")
                          ) {
                            try {
                              const match = videoUrl.match(
                                /https:\/\/res\.cloudinary\.com\/([^/]+)\/video\/upload\/(.+)/,
                              );
                              if (match) {
                                const cloudName = match[1];
                                let publicId = match[2];
                                publicId = publicId
                                  .split("/")
                                  .filter(
                                    (segment) =>
                                      !segment.match(
                                        /^(f_|vc_|ac_|af_|br_|q_|w_|h_|c_|so_|t_)/,
                                      ),
                                  )
                                  .join("/");
                                publicId = publicId.replace(
                                  /\.(mp4|mov|avi|mkv|webm)$/i,
                                  "",
                                );
                                return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/${publicId}.jpg`;
                              }
                            } catch (error) {
                              console.error(
                                "❌ Thumbnail generation error:",
                                error,
                              );
                            }
                          }

                          return "/placeholder-thumbnail.jpg";
                        };

                        const channelName =
                          video.uploadedBy?.channelname ||
                          video.uploadedBy?.name ||
                          video?.videochanel ||
                          "Unknown Channel";

                        return (
                          <div
                            key={video._id}
                            onClick={() => router.push(`/watch/${video._id}`)}
                            className="cursor-pointer group premium-hover-lift animate-slide-up opacity-0"
                            style={{
                              animationDelay: `${index * 50}ms`,
                              animationFillMode: "forwards",
                            }}
                          >
                            {/* Premium Video Thumbnail Container */}
                            <div className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden mb-4 premium-video-card shadow-lg group-hover:shadow-2xl transition-all duration-700">
                              {/* Gradient Border Effect on Hover */}
                              <div className="absolute -inset-[2px] bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-amber-500/0 group-hover:from-blue-500/50 group-hover:via-purple-500/50 group-hover:to-amber-500/50 rounded-2xl sm:rounded-3xl transition-all duration-700 -z-10 blur-sm opacity-0 group-hover:opacity-100"></div>

                              <div className="relative w-full h-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                {getVideoThumbnail(video).includes(
                                  "supabase.co",
                                ) ? (
                                  <img
                                    src={getVideoThumbnail(video)}
                                    alt={video?.videotitle || "Video thumbnail"}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                                    loading="lazy"
                                    onError={(e) => {
                                      const target =
                                        e.currentTarget as HTMLImageElement;
                                      const currentVideo = video;
                                      console.error(
                                        "❌ Thumbnail failed, trying video element",
                                      );
                                      target.style.display = "none";
                                      const parent = target.parentElement;
                                      if (
                                        parent &&
                                        !parent.querySelector("video")
                                      ) {
                                        const videoElement =
                                          document.createElement("video");
                                        videoElement.src =
                                          getVideoThumbnail(currentVideo);
                                        videoElement.className =
                                          "w-full h-full object-cover";
                                        videoElement.preload = "metadata";
                                        videoElement.muted = true;
                                        videoElement.playsInline = true;
                                        parent.appendChild(videoElement);
                                      }
                                    }}
                                  />
                                ) : (
                                  <video
                                    src={getVideoThumbnail(video)}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                                    preload="metadata"
                                    poster={getVideoThumbnail(video)}
                                    muted
                                    playsInline
                                  />
                                )}

                                {/* Premium Overlay Gradients */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-500"></div>

                                {/* Play Button Overlay - Premium */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-white/30 rounded-full blur-xl scale-150 animate-pulse"></div>
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 dark:bg-white flex items-center justify-center shadow-2xl transform scale-50 group-hover:scale-100 transition-transform duration-700 ease-out">
                                      <Play
                                        className="w-7 h-7 sm:w-9 sm:h-9 text-gray-900 ml-1"
                                        fill="currentColor"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Duration Badge - Premium */}
                                {video?.duration && (
                                  <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-black/85 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-lg luxury-font-accent">
                                    {video.duration}
                                  </div>
                                )}

                                {/* Premium Quality Badge */}
                                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform -translate-y-2 group-hover:translate-y-0">
                                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg luxury-font-accent uppercase tracking-wider">
                                    <Gem className="w-3.5 h-3.5" />
                                    <span>Premium</span>
                                  </div>
                                </div>

                                {/* View Count on Hover */}
                                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                                  <div className="bg-black/85 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg luxury-font-body">
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>
                                      {(video.views || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Video Info - Premium Styled */}
                            <div className="flex gap-4">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/channel/${video.uploadedBy?._id}`,
                                  );
                                }}
                                className="flex-shrink-0"
                              >
                                <div className="relative">
                                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-70 blur transition-opacity duration-500"></div>
                                  <Avatar className="relative w-11 h-11 sm:w-12 sm:h-12 ring-2 ring-white dark:ring-gray-900 shadow-lg">
                                    <AvatarImage
                                      src={getImageUrl(
                                        video.uploadedBy?.image,
                                        true,
                                      )}
                                      alt={channelName}
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold luxury-font-display">
                                      {channelName[0]?.toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3
                                  className="font-bold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2 mb-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-500 luxury-font-display"
                                  style={{
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {video?.videotitle || "Untitled Video"}
                                </h3>

                                <p
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                      `/channel/${video.uploadedBy?._id}`,
                                    );
                                  }}
                                  className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 mb-1.5 cursor-pointer font-medium transition-colors duration-300 luxury-font-body"
                                >
                                  {channelName}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 luxury-font-body">
                                  <span className="font-medium flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {(video.views || 0).toLocaleString()} views
                                  </span>
                                  <span className="text-amber-400 dark:text-amber-500">
                                    •
                                  </span>
                                  <span>
                                    {video.createdAt
                                      ? new Date(
                                          video.createdAt,
                                        ).toLocaleDateString()
                                      : "Recently"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Empty State - Premium Luxury */
                    <div className="text-center py-20 sm:py-28">
                      <div className="relative inline-block mb-8">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                        <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center shadow-inner">
                          <Video className="w-14 h-14 sm:w-18 sm:h-18 text-gray-400" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black luxury-font-display bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent mb-4">
                        No videos yet
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-lg mx-auto leading-relaxed luxury-font-body">
                        {isOwnChannel
                          ? "Start your journey as a creator! Upload your first video and share your unique content with the world."
                          : "This channel hasn't uploaded any videos yet. Stay tuned for upcoming content!"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Shorts Content - Premium Luxury Styled */}
              {contentTab === "shorts" && (
                <div className="w-full overflow-hidden">
                  <div className="px-3 sm:px-0">
                    {shortsLoading ? (
                      <div className="text-center py-20">
                        <div className="relative w-24 h-24 mx-auto mb-8">
                          <div className="absolute inset-0 rounded-full border-4 border-rose-200 dark:border-rose-900/50"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-rose-600 animate-spin"></div>
                          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                            <Film className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 font-semibold luxury-font-body">
                          Loading shorts...
                        </p>
                      </div>
                    ) : shortsError ? (
                      <div className="text-center py-20">
                        <div className="relative inline-block mb-8">
                          <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-3xl"></div>
                          <div className="relative bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-800/30 rounded-full w-28 h-28 flex items-center justify-center shadow-inner">
                            <Film className="w-14 h-14 text-rose-600" />
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 luxury-font-display">
                          Error Loading Shorts
                        </h3>
                        <p className="text-rose-600 dark:text-rose-400 mb-8 luxury-font-body">
                          {shortsError}
                        </p>
                        <button
                          onClick={() => setRefreshKey((prev) => prev + 1)}
                          className="px-10 py-4 premium-button-gold rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all luxury-font-accent"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : shorts.length > 0 ? (
                      <div>
                        {/* Premium Shorts Header */}
                        <div className="flex items-center justify-between mb-8 sm:mb-10">
                          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-4 luxury-font-display">
                            <div className="relative">
                              <div className="absolute inset-0 bg-rose-500/30 rounded-2xl blur-xl animate-pulse"></div>
                              <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30">
                                <Play
                                  className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-0.5"
                                  fill="white"
                                />
                              </div>
                            </div>
                            <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                              Shorts
                            </span>
                          </h2>
                          <div className="premium-badge premium-badge-gold">
                            <Gem className="w-3.5 h-3.5" />
                            <span>
                              {shorts.length} short
                              {shorts.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5 md:gap-6 w-full pb-4 px-1 sm:px-0">
                          {shorts.map((short, index) => {
                            const thumbnailUrl = getShortThumbnail(short);
                            const videoUrl = getShortVideoUrl(short);

                            const hasValidThumbnail =
                              thumbnailUrl &&
                              thumbnailUrl !== "fallback" &&
                              thumbnailUrl.startsWith("http");
                            const hasValidVideo =
                              videoUrl && videoUrl.startsWith("http");

                            return (
                              <div
                                key={short._id || short.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  const shortId = short._id || short.id;
                                  if (shortId) {
                                    router.push(`/shorts?id=${shortId}`);
                                  }
                                }}
                                className="group cursor-pointer w-full transform transition-all duration-700 active:scale-95 premium-hover-lift animate-slide-up opacity-0"
                                style={{
                                  animationDelay: `${index * 30}ms`,
                                  animationFillMode: "forwards",
                                }}
                              >
                                {/* Premium Shorts Card */}
                                <div className="aspect-[9/16] rounded-2xl sm:rounded-3xl overflow-hidden relative shadow-lg group-hover:shadow-2xl group-hover:shadow-rose-500/20 transition-all duration-700">
                                  {/* Solid background */}
                                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 z-0"></div>

                                  {/* Animated Border on Hover */}
                                  <div className="absolute -inset-[2px] bg-gradient-to-r from-rose-500/0 via-pink-500/0 to-amber-500/0 group-hover:from-rose-500/60 group-hover:via-pink-500/60 group-hover:to-amber-500/60 rounded-2xl sm:rounded-3xl transition-all duration-700 z-[1] blur-sm opacity-0 group-hover:opacity-100"></div>

                                  {/* Media Layer */}
                                  <div className="absolute inset-0 w-full h-full z-[20]">
                                    {hasValidThumbnail ? (
                                      <img
                                        src={thumbnailUrl}
                                        alt={short.title || "Short"}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                                        loading="lazy"
                                        style={{
                                          position: "absolute",
                                          top: 0,
                                          left: 0,
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                          display: "block",
                                          zIndex: 20,
                                        }}
                                        onError={(e) => {
                                          console.error(
                                            "❌ Thumbnail failed:",
                                            short._id,
                                          );
                                          const target = e.currentTarget;
                                          target.style.display = "none";

                                          if (hasValidVideo) {
                                            const parent = target.parentElement;
                                            if (
                                              parent &&
                                              !parent.querySelector(
                                                "video.backup-video",
                                              )
                                            ) {
                                              const video =
                                                document.createElement("video");
                                              video.className = "backup-video";
                                              video.style.cssText =
                                                "position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block; z-index: 20";
                                              video.src = videoUrl;
                                              video.preload = "metadata";
                                              video.muted = true;
                                              video.playsInline = true;
                                              parent.appendChild(video);
                                            }
                                          }
                                        }}
                                      />
                                    ) : hasValidVideo ? (
                                      <video
                                        src={videoUrl}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                                        preload="metadata"
                                        muted
                                        playsInline
                                        style={{
                                          position: "absolute",
                                          top: 0,
                                          left: 0,
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                          display: "block",
                                          zIndex: 20,
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-500 via-pink-600 to-rose-700">
                                        <div className="text-center p-4">
                                          <div className="relative mb-4">
                                            <div className="absolute inset-0 rounded-full animate-ping opacity-40 bg-white/30"></div>
                                            <div className="relative w-18 h-18 mx-auto rounded-full flex items-center justify-center shadow-2xl bg-white/95">
                                              <Play
                                                className="w-9 h-9 ml-1 text-rose-600"
                                                fill="currentColor"
                                              />
                                            </div>
                                          </div>
                                          <p
                                            className="text-xs font-black text-white tracking-widest uppercase luxury-font-accent"
                                            style={{
                                              textShadow:
                                                "0 2px 8px rgba(0,0,0,0.4)",
                                            }}
                                          >
                                            {short.title || "SHORT"}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Bottom Gradient Overlay */}
                                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-[25]"></div>

                                  {/* Top Gradient for Premium Badge */}
                                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-[25]"></div>

                                  {/* Hover Overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-rose-600/0 to-transparent group-hover:from-rose-600/20 transition-all duration-500 pointer-events-none z-[22]"></div>

                                  {/* Premium Badge - Top Left */}
                                  <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-500 transform -translate-y-2 group-hover:translate-y-0 z-30">
                                    <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-lg uppercase tracking-wider luxury-font-accent">
                                      <Crown className="w-3 h-3" />
                                      <span>Short</span>
                                    </div>
                                  </div>

                                  {/* Views Badge */}
                                  <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg z-30 luxury-font-accent">
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>
                                      {(short.views || 0).toLocaleString()}
                                    </span>
                                  </div>

                                  {/* Duration Badge */}
                                  {short.duration && (
                                    <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg z-30 luxury-font-accent">
                                      {short.duration}s
                                    </div>
                                  )}

                                  {/* Play Button - Center */}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-700 flex items-center justify-center z-[35]">
                                    <div className="opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-700 ease-out">
                                      <div className="relative">
                                        <div className="absolute inset-0 rounded-full animate-ping opacity-40 bg-rose-500"></div>
                                        <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-2xl ring-4 ring-white/30">
                                          <Play
                                            className="w-8 h-8 sm:w-9 sm:h-9 text-white ml-1"
                                            fill="white"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Shine Effect */}
                                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none z-[40]">
                                    <div className="absolute inset-0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/25 to-transparent"></div>
                                  </div>
                                </div>

                                {/* Title & Channel Info */}
                                <div className="mt-4 px-1">
                                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors duration-500 luxury-font-display">
                                    {short.title}
                                  </h3>

                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-6 h-6 ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm">
                                      <AvatarImage
                                        src={getImageUrl(
                                          short.userId?.image || channel?.image,
                                          true,
                                        )}
                                        alt={
                                          short.userId?.channelName ||
                                          channel?.channelname ||
                                          "Channel"
                                        }
                                      />
                                      <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-600 text-white text-[10px] font-bold luxury-font-display">
                                        {(short.userId?.channelName ||
                                          channel?.channelname ||
                                          "U")[0].toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium line-clamp-1 luxury-font-body">
                                      {short.userId?.channelName ||
                                        channel?.channelname ||
                                        "Unknown"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Empty State - Premium Luxury */
                      <div className="text-center py-20 sm:py-28">
                        <div className="relative inline-block mb-8">
                          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
                          <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center shadow-inner">
                            <Film className="w-14 h-14 sm:w-18 sm:h-18 text-gray-400" />
                          </div>
                          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                            <Play
                              className="w-5 h-5 text-white ml-0.5"
                              fill="white"
                            />
                          </div>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black luxury-font-display bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent mb-4">
                          No shorts yet
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-10 max-w-lg mx-auto leading-relaxed luxury-font-body">
                          {isOwnChannel
                            ? "Create engaging vertical content! Upload your first short and connect with your audience in a new way."
                            : "This channel hasn't uploaded any shorts yet. Check back later for exciting short-form content!"}
                        </p>
                        {isOwnChannel && (
                          <button
                            onClick={() => router.push("/shorts/upload")}
                            className="group relative px-10 py-5 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:via-pink-600 hover:to-rose-700 text-white rounded-2xl font-bold transition-all duration-500 inline-flex items-center gap-3 shadow-xl shadow-rose-500/30 hover:shadow-2xl hover:shadow-rose-500/50 hover:scale-105 overflow-hidden luxury-font-accent text-lg"
                          >
                            <div className="absolute inset-0 premium-shimmer"></div>
                            <Upload className="w-6 h-6 group-hover:-translate-y-1 transition-transform duration-300 relative z-10" />
                            <span className="relative z-10">
                              Upload Your First Short
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {},
  };
};

export default ChannelPage;
