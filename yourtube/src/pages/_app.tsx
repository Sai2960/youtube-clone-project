import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://${"https://youtube-clone-project-q3pd.onrender.com"

}';

/**
 * Global state tracker to prevent duplicate initialization
 * Using a module-level object ensures these values persist across re-renders
 * without triggering React's re-render cycle
 */
const initializationState = {
  hasInitializedTheme: false,
  hasCheckedLocation: false,
  currentUserTheme: null as string | null,
  hasSetOverflow: false,
};

function AppContent({ Component, pageProps }: AppProps) {
  const { user } = useUser();
  const router = useRouter();
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

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
   * This runs once when the app loads and sets up the initial theme
   * based on user preferences or system settings
   */
  useEffect(() => {
    // Skip if not in browser or already initialized
    if (typeof window === 'undefined' || initializationState.hasInitializedTheme) {
      return;
    }
    
    initializationState.hasInitializedTheme = true;
    const selectedTheme = initializeTheme();
    setIsThemeReady(true);
    
    console.log('🎨 Theme system initialized:', selectedTheme);
  }, []);

  /**
   * Set up page overflow rules to prevent horizontal scrolling
   * This is a one-time setup that applies to the entire app
   */
  useEffect(() => {
    if (typeof window === 'undefined' || initializationState.hasSetOverflow) {
      return;
    }
    
    initializationState.hasSetOverflow = true;
    
    // Apply overflow rules to both body and html
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.maxWidth = '100vw';
    document.documentElement.style.maxWidth = '100vw';
    
    console.log('📐 Page overflow rules applied');
    
    // Cleanup function to restore defaults
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
   * Only runs for guest users (not logged in)
   * Logged-in users have their own theme preferences
   */
  useEffect(() => {
    // Wait for theme to be ready and skip if user is logged in
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
          
          // Store location info for later use
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
   * This overrides location-based themes for logged-in users
   */
  useEffect(() => {
    if (!isThemeReady || !user?.theme) {
      return;
    }
    
    // Create a unique key to track if this theme has been applied
    const themeIdentifier = `${user._id}-${user.theme}`;
    
    // Skip if we've already applied this exact theme
    if (initializationState.currentUserTheme === themeIdentifier) {
      return;
    }
    
    console.log('👤 Applying user theme preference:', user.theme);
    applyTheme(user.theme as 'light' | 'dark');
    initializationState.currentUserTheme = themeIdentifier;
    
    // Prevent location check from overriding user theme
    initializationState.hasCheckedLocation = true;
  }, [user?._id, user?.theme, isThemeReady]);

  /**
   * Handle mobile bottom navigation spacing
   * Adjusts body padding to prevent content from being hidden
   * behind the fixed bottom navigation bar
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
      
      // Only update if changed to avoid unnecessary DOM manipulation
      if (document.body.style.paddingBottom !== newPadding) {
        document.body.style.paddingBottom = newPadding;
      }
    };

    adjustMobileSpacing();
    
    // Debounce resize events to avoid excessive updates
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
   * This creates a better UX by locking the background
   */
  useEffect(() => {
    const scrollBehavior = showMobileSidebar ? 'hidden' : 'unset';
    
    // Only update if value actually changed
    if (document.body.style.overflow !== scrollBehavior) {
      document.body.style.overflow = scrollBehavior;
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMobileSidebar]);

  /**
   * Show loading spinner while theme is being initialized
   * Uses theme-aware colors for a seamless experience
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
   * These pages manage their own layout structure
   */
  if (shouldHideLayout) {
    return (
      <>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
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
   * Standard layout used for most pages
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

/**
 * Root App component
 * Wraps the entire app with necessary context providers
 * Order matters: UserProvider must be outermost since other providers depend on it
 */
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