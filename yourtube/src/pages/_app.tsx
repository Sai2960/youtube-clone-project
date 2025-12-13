import { useEffect, useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider, useUser } from "../lib/AuthContext";
import { SubscriptionProvider } from "@/lib/SubscriptionContext";
import { SocketProvider } from "@/lib/SocketProvider";
import { initializeTheme, applyTheme, getStoredTheme } from '../lib/theme';
import CallNotification from "@/components/ui/CallNotification";
import MobileBottomNav from "@/components/ui/MobileBottomNav";
import { initKeepAlive } from '@/lib/keepAlive';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://youtube-clone-project-q3pd.onrender.com";

/**
 * Global state tracker to prevent duplicate initialization
 */
const initializationState = {
  hasInitializedTheme: false,
  hasCheckedLocation: false,
  currentUserTheme: null as string | null,
  hasSetOverflow: false,
  hasClearedCache: false,
};

function AppContent({ Component, pageProps }: AppProps) {
  const { user } = useUser();
  
  useEffect(() => {
    initKeepAlive();
  }, []);
  
  const router = useRouter();
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // ============================================================================
  // 🔴 CRITICAL: ANDROID CACHE CLEARING
  // ============================================================================
  useEffect(() => {
    if (typeof window === 'undefined' || initializationState.hasClearedCache) {
      return;
    }
    
    initializationState.hasClearedCache = true;
    
    const clearAllCaches = async () => {
      try {
        console.log('🧹 Clearing all Android caches...');
        
        // 1. Clear Service Worker cache
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log('✅ Service Worker unregistered');
          }
        }
        
        // 2. Clear Cache Storage API
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => {
              console.log('🗑️ Deleting cache:', cacheName);
              return caches.delete(cacheName);
            })
          );
          console.log('✅ All cache storage cleared');
        }
        
        // 3. Force page reload on Android if from cache
        const navigation = (performance as any).getEntriesByType?.('navigation')?.[0] as any;
        if (navigation?.type === 'back_forward') {
          console.log('⚠️ Page loaded from BF cache, forcing reload...');
          window.location.reload();
        }
        
      } catch (error) {
        console.error('❌ Cache clearing error:', error);
      }
    };
    
    clearAllCaches();
  }, []);

  // ============================================================================
  // 🔴 CRITICAL: FORCE PAGE REFRESH ON VISIBILITY CHANGE (Android Tab Switch)
  // ============================================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page visible - dispatching refresh event');
        
        // Dispatch custom event to force channel page refresh
        window.dispatchEvent(new CustomEvent('forceChannelRefresh', {
          detail: { timestamp: Date.now() }
        }));
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ============================================================================
  // 🔴 CRITICAL: PAGE FOCUS REFRESH (Android)
  // ============================================================================
  useEffect(() => {
    const handleFocus = () => {
      console.log('🎯 Window focused - triggering refresh');
      window.dispatchEvent(new CustomEvent('forceChannelRefresh', {
        detail: { timestamp: Date.now() }
      }));
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Determine which pages should hide the standard layout
  const shouldHideLayout = useMemo(() => {
    const currentPath = router.pathname;
    const isShortsPage = currentPath.startsWith('/shorts');
    const isCallPage = currentPath.startsWith('/call');
    const isAuthPage = currentPath === '/login' || currentPath === '/signup';
    
    return isShortsPage || isCallPage || isAuthPage;
  }, [router.pathname]);

  // Memoized handlers for mobile sidebar
  const openMobileSidebar = useCallback(() => {
    setShowMobileSidebar(true);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setShowMobileSidebar(false);
  }, []);

  /**
   * Initialize theme on first mount
   */
  useEffect(() => {
    if (typeof window === 'undefined' || initializationState.hasInitializedTheme) {
      return;
    }
    
    initializationState.hasInitializedTheme = true;
    const selectedTheme = initializeTheme();
    setIsThemeReady(true);
    
    console.log('🎨 Theme system initialized:', selectedTheme);
  }, []);

  /**
   * Set up page overflow rules
   */
  useEffect(() => {
    if (typeof window === 'undefined' || initializationState.hasSetOverflow) {
      return;
    }
    
    initializationState.hasSetOverflow = true;
    
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.maxWidth = '100vw';
    document.documentElement.style.maxWidth = '100vw';
    
    console.log('📐 Page overflow rules applied');
    
    return () => {
      document.body.style.overflowX = '';
      document.documentElement.style.overflowX = '';
      document.body.style.maxWidth = '';
      document.documentElement.style.maxWidth = '';
      initializationState.hasSetOverflow = false;
    };
  }, []);

  /**
   * Check user's location and apply region-based theme
   */
  useEffect(() => {
    if (!isThemeReady || initializationState.hasCheckedLocation || user) {
      return;
    }
    
    initializationState.hasCheckedLocation = true;
    
    const fetchLocationBasedTheme = async () => {
      try {
        console.log('🌍 Checking location-based theme preferences...');
        
        const response = await fetch(`${API_URL}/api/location/check-location`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          console.log('Location check returned non-OK status');
          return;
        }
        
        const locationData = await response.json();
        
        if (locationData.success && locationData.theme) {
          console.log('✅ Applying location-based theme:', locationData.theme);
          applyTheme(locationData.theme as 'light' | 'dark');
          
          sessionStorage.setItem('locationTheme', locationData.theme);
          sessionStorage.setItem('locationData', JSON.stringify({
            country: locationData.country || locationData.location?.country,
            region: locationData.region || locationData.location?.state,
            city: locationData.city || locationData.location?.city,
            timezone: locationData.timezone || locationData.location?.timezone,
          }));
        }
      } catch (error) {
        console.error('❌ Failed to fetch location-based theme:', error);
      }
    };
    
    fetchLocationBasedTheme();
  }, [isThemeReady, user]);

  /**
   * Apply user's personal theme preference
   */
  useEffect(() => {
    if (!isThemeReady || !user?.theme) {
      return;
    }
    
    const themeIdentifier = `${user._id}-${user.theme}`;
    
    if (initializationState.currentUserTheme === themeIdentifier) {
      return;
    }
    
    console.log('👤 Applying user theme preference:', user.theme);
    applyTheme(user.theme as 'light' | 'dark');
    initializationState.currentUserTheme = themeIdentifier;
    initializationState.hasCheckedLocation = true;
  }, [user?._id, user?.theme, isThemeReady]);

  /**
   * Handle mobile bottom navigation spacing
   */
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const adjustMobileSpacing = () => {
      const isMobileView = window.innerWidth < 1024;
      const shouldAddPadding = isMobileView && !shouldHideLayout;
      const newPadding = shouldAddPadding 
        ? 'calc(56px + env(safe-area-inset-bottom, 0px))' 
        : '0';
      
      if (document.body.style.paddingBottom !== newPadding) {
        document.body.style.paddingBottom = newPadding;
      }
    };

    adjustMobileSpacing();
    
    let resizeDebounceTimer: NodeJS.Timeout;
    const handleWindowResize = () => {
      clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(adjustMobileSpacing, 150);
    };

    window.addEventListener('resize', handleWindowResize, { passive: true });

    return () => {
      clearTimeout(resizeDebounceTimer);
      window.removeEventListener('resize', handleWindowResize);
      document.body.style.paddingBottom = '0';
    };
  }, [shouldHideLayout]);

  /**
   * Prevent scrolling when mobile sidebar is open
   */
  useEffect(() => {
    const scrollBehavior = showMobileSidebar ? 'hidden' : 'unset';
    
    if (document.body.style.overflow !== scrollBehavior) {
      document.body.style.overflow = scrollBehavior;
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMobileSidebar]);

  /**
   * Loading spinner while theme initializes
   */
  if (!isThemeReady) {
    const currentTheme = typeof window !== 'undefined' ? getStoredTheme() : 'dark';
    const backgroundColor = currentTheme === 'dark' ? '#0f0f0f' : '#ffffff';
    const spinnerBorderColor = currentTheme === 'dark' ? '#ffffff' : '#0f0f0f';
    
    return (
      <div 
        className="flex flex-col items-center justify-center h-screen gap-4"
        style={{ backgroundColor }}
      >
        <div 
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
          style={{ borderColor: spinnerBorderColor }}
        />
      </div>
    );
  }

  /**
   * Render pages without layout (Shorts, Calls, Auth pages)
   */
  if (shouldHideLayout) {
    return (
      <>
      <Head>
  <meta 
    name="viewport" 
    content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" 
  />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>YouTube Clone</title>
  </Head>
        
        <Component {...pageProps} />
        
        <Toaster />
        <CallNotification />
      </>
    );
  }

  /**
   * Main app layout with header, sidebar, and content area
   */
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <title>YouTube Clone</title>
      </Head>
      
      <div className="flex flex-col h-screen overflow-hidden bg-youtube-primary">
        <Header onMenuClick={openMobileSidebar} />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            isMobileOpen={showMobileSidebar}
            onMobileClose={closeMobileSidebar}
          />
          
          <main className="flex-1 overflow-y-auto bg-youtube-primary pb-16 md:pb-0">
            <Component {...pageProps} />
          </main>
        </div>
        
        <MobileBottomNav />
        <Toaster />
        <CallNotification />
      </div>
    </>
  );
}


export default function App(appProps: AppProps) {
  return (
    <UserProvider>
      <SubscriptionProvider>
        <SocketProvider>
          <AppContent {...appProps} />
        </SocketProvider>
      </SubscriptionProvider>
    </UserProvider>
  );
}