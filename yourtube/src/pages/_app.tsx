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
    
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    const clearAllCaches = async () => {
      try {
        console.log('🧹 Starting comprehensive cache clear...');
        
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
        
        // 3. 🔴 ANDROID: Clear sessionStorage (aggressive)
        if (isAndroid) {
          try {
            sessionStorage.clear();
            console.log('✅ Android: sessionStorage cleared');
          } catch (e) {
            console.warn('⚠️ Could not clear sessionStorage:', e);
          }
        }
        
        // 4. 🔴 ANDROID: Force reload if from BF cache
        const navigation = (performance as any).getEntriesByType?.('navigation')?.[0] as any;
        if (navigation?.type === 'back_forward') {
          console.log('⚠️ Page loaded from BF cache, forcing reload...');
          window.location.reload();
        }
        
        // 5. 🔴 ANDROID: Clear any stale channel data from localStorage
        if (isAndroid) {
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('channel_') || key.startsWith('video_') || key.startsWith('short_')) {
              localStorage.removeItem(key);
              console.log('🗑️ Removed stale data:', key);
            }
          });
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
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page visible - dispatching refresh');
        
        // 🔴 ANDROID: More aggressive refresh
        if (isAndroid) {
          // Clear any cached API responses
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => {
                if (name.includes('api') || name.includes('channel')) {
                  caches.delete(name);
                }
              });
            });
          }
        }
        
        // Dispatch refresh event
        window.dispatchEvent(new CustomEvent('forceChannelRefresh', {
          detail: { 
            timestamp: Date.now(),
            source: 'visibility',
            isAndroid 
          }
        }));
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);


   // ============================================================================
  // 🔴 NEW: ANDROID ORIENTATION CHANGE REFRESH
  // ============================================================================
  useEffect(() => {
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    
    if (!isAndroid) return;
    
    const handleOrientationChange = () => {
      console.log('🔄 Orientation changed - refreshing');
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('forceChannelRefresh', {
          detail: { 
            timestamp: Date.now(),
            source: 'orientation' 
          }
        }));
      }, 300);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  
  // ============================================================================
  // 🔴 CRITICAL: PAGE FOCUS REFRESH (Android)
  // ============================================================================
  useEffect(() => {
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    
    const handleFocus = () => {
      console.log('🎯 Window focused - triggering refresh');
      
      // 🔴 ANDROID: Add delay for stability
      if (isAndroid) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('forceChannelRefresh', {
            detail: { 
              timestamp: Date.now(),
              source: 'focus',
              isAndroid 
            }
          }));
        }, 100);
      } else {
        window.dispatchEvent(new CustomEvent('forceChannelRefresh', {
          detail: { 
            timestamp: Date.now(),
            source: 'focus' 
          }
        }));
      }
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

  // ✅ CRITICAL: Force shorts page visibility on mobile
// 🔍 DEBUG: Log HTML/Body state on shorts page
// Add RIGHT AFTER the data-page useEffect
// Replace the entire useEffect for shorts body override
useEffect(() => {
  if (router.pathname.startsWith('/shorts')) {
    console.log('🎬 Applying shorts overrides...');
    
    // ✅ CRITICAL: Override HTML element
    document.documentElement.style.position = 'fixed';
    document.documentElement.style.inset = '0';
    document.documentElement.style.zIndex = '0';
    document.documentElement.style.pointerEvents = 'none';
    document.documentElement.style.background = 'transparent';
    
    // ✅ CRITICAL: Override body stacking
    document.body.style.position = 'fixed';
    document.body.style.inset = '0';
    document.body.style.zIndex = '0';
    document.body.style.pointerEvents = 'none';
    document.body.style.background = 'transparent';
    
    // ✅ CRITICAL: Override #__next
    const nextDiv = document.getElementById('__next');
    if (nextDiv) {
      nextDiv.style.position = 'fixed';
      nextDiv.style.inset = '0';
      nextDiv.style.zIndex = '0';
      nextDiv.style.pointerEvents = 'none';
      nextDiv.style.background = 'transparent';
    }
    
    console.log('✅ Shorts overrides applied');
  } else {
    // ✅ Reset when leaving shorts
    document.documentElement.style.position = '';
    document.documentElement.style.inset = '';
    document.documentElement.style.zIndex = '';
    document.documentElement.style.pointerEvents = '';
    document.documentElement.style.background = '';
    
    document.body.style.position = '';
    document.body.style.inset = '';
    document.body.style.zIndex = '';
    document.body.style.pointerEvents = '';
    document.body.style.background = '';
    
    const nextDiv = document.getElementById('__next');
    if (nextDiv) {
      nextDiv.style.position = '';
      nextDiv.style.inset = '';
      nextDiv.style.zIndex = '';
      nextDiv.style.pointerEvents = '';
      nextDiv.style.background = '';
    }
  }
}, [router.pathname]);
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