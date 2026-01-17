/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useMemo, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider, useUser } from "../lib/AuthContext";
import { SubscriptionProvider } from "@/lib/SubscriptionContext";
import { SocketProvider } from "@/lib/SocketProvider";
import { initializeTheme, applyTheme, getStoredTheme } from "../lib/theme";
import CallNotification from "@/components/ui/CallNotification";
import MobileBottomNav from "@/components/ui/MobileBottomNav";
import { initKeepAlive } from "@/lib/keepAlive";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://youtube-clone-project-production.up.railway.app";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/signup"];

/**
 * Global state tracker to prevent duplicate initialization
 */
const initializationState = {
  hasInitializedTheme: false,
  hasCheckedLocation: false,
  currentUserTheme: null as string | null,
  hasSetOverflow: false,
  hasClearedCache: false,
  hasInitializedAudioContext: false,
  hasCheckedAuth: false,
};
function AppContent({ Component, pageProps }: AppProps) {
  const { user, updateUser } = useUser();
  const router = useRouter();
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // ============================================================================
  // 🔴 CRITICAL: AUTHENTICATION REDIRECT LOGIC
  // ============================================================================
  useEffect(() => {
    if (typeof window === "undefined" || initializationState.hasCheckedAuth) {
      return;
    }

    const checkAuthentication = () => {
      const token = localStorage.getItem("token");
      const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);
      const isAuthPage =
        router.pathname === "/login" || router.pathname === "/signup";

      console.log("🔐 Auth Check:", {
        hasToken: !!token,
        isPublicRoute,
        currentPath: router.pathname,
      });

      // If user has token but is on auth page, redirect to home
      if (token && isAuthPage) {
        const returnUrl = router.query.returnUrl as string;
        const destination =
          returnUrl && returnUrl !== "/login" && returnUrl !== "/signup"
            ? returnUrl
            : "/";

        console.log("✅ User authenticated, redirecting to:", destination);
        router.replace(destination);
        return;
      }

      // Mark as checked and allow rendering
      initializationState.hasCheckedAuth = true;
      setIsAuthChecking(false);
    };

    // Small delay to ensure router is ready
    const timeoutId = setTimeout(checkAuthentication, 100);

    return () => clearTimeout(timeoutId);
  }, [router.pathname, router.query.returnUrl]);

  // ============================================================================
  // 🔴 CRITICAL: PREVENT AUDIOCONTEXT CREATION BEFORE USER INTERACTION
  // ============================================================================
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      initializationState.hasInitializedAudioContext
    ) {
      return;
    }

    initializationState.hasInitializedAudioContext = true;

    const originalAudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;

    if (originalAudioContext) {
      let userHasInteracted = false;

      const markInteraction = () => {
        userHasInteracted = true;
        console.log("✅ User interaction detected globally");
      };

      document.addEventListener("click", markInteraction, {
        once: true,
        passive: true,
      });
      document.addEventListener("touchstart", markInteraction, {
        once: true,
        passive: true,
      });
      document.addEventListener("keydown", markInteraction, {
        once: true,
        passive: true,
      });

      const WrappedAudioContext = function (this: any, ...args: any[]) {
        if (!userHasInteracted) {
          console.warn(
            "⚠️ AudioContext created before user interaction - will be suspended",
          );
        }
        return new originalAudioContext(...args);
      };

      WrappedAudioContext.prototype = originalAudioContext.prototype;

      (window as any).AudioContext = WrappedAudioContext;
      (window as any).webkitAudioContext = WrappedAudioContext;

      console.log("✅ AudioContext wrapper installed");
    }
  }, []);

  // ============================================================================
  // 🔴 KEEP ALIVE INITIALIZATION
  // ============================================================================
  useEffect(() => {
    initKeepAlive();
  }, []);
  // ============================================================================
  // 🔴 CRITICAL: ANDROID CACHE CLEARING
  // ============================================================================
  useEffect(() => {
    if (typeof window === "undefined" || initializationState.hasClearedCache) {
      return;
    }

    initializationState.hasClearedCache = true;

    const clearAllCaches = async () => {
      try {
        console.log("🧹 Clearing all Android caches...");

        if ("serviceWorker" in navigator) {
          const registrations =
            await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log("✅ Service Worker unregistered");
          }
        }

        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map((cacheName) => {
              console.log("🗑️ Deleting cache:", cacheName);
              return caches.delete(cacheName);
            }),
          );
          console.log("✅ All cache storage cleared");
        }

        const navigation = (performance as any).getEntriesByType?.(
          "navigation",
        )?.[0] as any;
        if (navigation?.type === "back_forward") {
          console.log("⚠️ Page loaded from BF cache, forcing reload...");
          window.location.reload();
        }
      } catch (error) {
        console.error("❌ Cache clearing error:", error);
      }
    };

    clearAllCaches();
  }, []);

  // ============================================================================
  // 🔴 CRITICAL: FORCE PAGE REFRESH ON VISIBILITY CHANGE (Android Tab Switch)
  // ============================================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("👁️ Page visible - dispatching refresh event");

        window.dispatchEvent(
          new CustomEvent("forceChannelRefresh", {
            detail: { timestamp: Date.now() },
          }),
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // ============================================================================
  // 🔴 CRITICAL: PAGE FOCUS REFRESH (Android)
  // ============================================================================
  useEffect(() => {
    const handleFocus = () => {
      console.log("🎯 Window focused - triggering refresh");
      window.dispatchEvent(
        new CustomEvent("forceChannelRefresh", {
          detail: { timestamp: Date.now() },
        }),
      );
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);
  // ============================================================================
  // DETERMINE LAYOUT VISIBILITY
  // ============================================================================
  // NEW - Add specific check for shorts upload:
  const shouldHideLayout = useMemo(() => {
    const currentPath = router.pathname;
    const isShortsPage = currentPath.startsWith("/shorts");
    const isCallPage = currentPath.startsWith("/call");
    const isAuthPage = currentPath === "/login" || currentPath === "/signup";

    return isShortsPage || isCallPage || isAuthPage;
  }, [router.pathname]);

  const shouldShowMobileNav = useMemo(() => {
    const currentPath = router.pathname;
    const isShortsPage = currentPath.startsWith("/shorts");
    const isCallPage = currentPath.startsWith("/call");
    const isAuthPage = currentPath === "/login" || currentPath === "/signup";

    return !isShortsPage && !isCallPage && !isAuthPage;
  }, [router.pathname]);

  // ============================================================================
  // MOBILE SIDEBAR HANDLERS
  // ============================================================================
  const openMobileSidebar = useCallback(() => {
    setShowMobileSidebar(true);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setShowMobileSidebar(false);
  }, []);

  // ============================================================================
  // THEME INITIALIZATION
  // ============================================================================
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      initializationState.hasInitializedTheme
    ) {
      return;
    }

    initializationState.hasInitializedTheme = true;
    const selectedTheme = initializeTheme();
    setIsThemeReady(true);

    console.log("🎨 Theme system initialized:", selectedTheme);
  }, []);

  // ============================================================================
  // PAGE OVERFLOW RULES
  // ============================================================================
  useEffect(() => {
    if (typeof window === "undefined" || initializationState.hasSetOverflow) {
      return;
    }

    initializationState.hasSetOverflow = true;

    document.body.style.overflowX = "hidden";
    document.documentElement.style.overflowX = "hidden";
    document.body.style.maxWidth = "100vw";
    document.documentElement.style.maxWidth = "100vw";

    console.log("📐 Page overflow rules applied");

    // ✅ CRITICAL: Remove background on login/signup pages
    const isAuthPage =
      router.pathname === "/login" || router.pathname === "/signup";
    if (isAuthPage) {
      document.body.style.background = "transparent";
      document.documentElement.style.background = "transparent";
      console.log("🎨 Auth page: Background cleared");
    }

    return () => {
      document.body.style.overflowX = "";
      document.documentElement.style.overflowX = "";
      document.body.style.maxWidth = "";
      document.documentElement.style.maxWidth = "";
      initializationState.hasSetOverflow = false;
    };
  }, []);
  // ============================================================================
  // LOCATION-BASED THEME
  // ============================================================================
  // ============================================================================
  // 🔴 CRITICAL: CONTINUOUS THEME CHECKER FOR TIME-BASED SWITCHING
  // ============================================================================
  useEffect(() => {
    if (typeof window === "undefined" || !isThemeReady) return;

    let intervalId: NodeJS.Timeout;
    let lastCheckedMinute = -1;

    const checkAndApplyTheme = async () => {
      try {
        // Get current minute to avoid redundant checks
        const now = new Date();
        const currentMinute = now.getHours() * 60 + now.getMinutes();

        // Only check if minute has changed
        if (currentMinute === lastCheckedMinute) return;
        lastCheckedMinute = currentMinute;

        console.log("⏰ Checking theme at", now.toLocaleTimeString());

        // Fetch location-based theme from server
        const response = await fetch(`${API_URL}/auth/check-location`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          console.warn("⚠️ Location check failed, using stored theme");
          return;
        }

        const locationData = await response.json();

        if (locationData.success && locationData.theme) {
          const currentTheme = getStoredTheme();

          // Only apply if theme changed
          if (currentTheme !== locationData.theme) {
            console.log(
              `🎨 Auto-switching theme: ${currentTheme} → ${locationData.theme}`,
            );
            applyTheme(locationData.theme as "light" | "dark");

            // Update user context if logged in
            if (user) {
              updateUser({ theme: locationData.theme });
            }
          } else {
            console.log(`✅ Theme already correct: ${currentTheme}`);
          }
        }
      } catch (error) {
        console.error("❌ Theme check error:", error);
      }
    };

    // Initial check
    checkAndApplyTheme();

    // Check every minute
    intervalId = setInterval(checkAndApplyTheme, 60000);

    console.log("✅ Real-time theme checker started");

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log("🛑 Theme checker stopped");
      }
    };
  }, [isThemeReady, user]);

  // ============================================================================
  // USER THEME PREFERENCE
  // ============================================================================
  useEffect(() => {
    if (!isThemeReady || !user?.theme) {
      return;
    }

    const themeIdentifier = `${user._id}-${user.theme}`;

    if (initializationState.currentUserTheme === themeIdentifier) {
      return;
    }

    console.log("👤 Applying user theme preference:", user.theme);
    applyTheme(user.theme as "light" | "dark");
    initializationState.currentUserTheme = themeIdentifier;
    initializationState.hasCheckedLocation = true;
  }, [user?._id, user?.theme, isThemeReady]);

  // ============================================================================
  // MOBILE BOTTOM NAVIGATION SPACING
  // ============================================================================
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const adjustMobileSpacing = () => {
      const isMobileView = window.innerWidth < 1024;
      const shouldAddPadding = isMobileView && !shouldHideLayout;
      const newPadding = shouldAddPadding
        ? "calc(56px + env(safe-area-inset-bottom, 0px))"
        : "0";

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

    window.addEventListener("resize", handleWindowResize, { passive: true });

    return () => {
      clearTimeout(resizeDebounceTimer);
      window.removeEventListener("resize", handleWindowResize);
      document.body.style.paddingBottom = "0";
    };
  }, [shouldHideLayout]);

  // ============================================================================
  // PREVENT SCROLLING WHEN MOBILE SIDEBAR IS OPEN
  // ============================================================================
  useEffect(() => {
    const scrollBehavior = showMobileSidebar ? "hidden" : "unset";

    if (document.body.style.overflow !== scrollBehavior) {
      document.body.style.overflow = scrollBehavior;
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showMobileSidebar]);
  // ============================================================================
  // 🔴 CRITICAL: SHORTS PAGE VISIBILITY OVERRIDES
  // ============================================================================
  // ============================================================================
  // 🔴 CRITICAL: SHORTS PAGE VISIBILITY OVERRIDES (WITH MODAL EXCEPTION)
  // ============================================================================
  useEffect(() => {
    const isShortsPlayer =
      router.pathname === "/shorts" || router.pathname === "/shorts/";
    const isShortsUpload = router.pathname === "/shorts/upload";

    if (isShortsPlayer && !isShortsUpload) {
      console.log("🎬 Applying shorts overrides...");

      document.documentElement.style.position = "fixed";
      document.documentElement.style.inset = "0";
      document.documentElement.style.zIndex = "0";
      document.documentElement.style.background = "transparent";
      // ✅ REMOVED pointer-events blocking

      document.body.style.position = "fixed";
      document.body.style.inset = "0";
      document.body.style.zIndex = "0";
      document.body.style.background = "transparent";
      // ✅ REMOVED pointer-events blocking

      const nextDiv = document.getElementById("__next");
      if (nextDiv) {
        nextDiv.style.position = "fixed";
        nextDiv.style.inset = "0";
        nextDiv.style.zIndex = "0";
        nextDiv.style.background = "transparent";
        // ✅ REMOVED pointer-events blocking
      }

      console.log("✅ Shorts overrides applied (modals enabled)");
    } else {
      // Reset when leaving shorts
      document.documentElement.style.position = "";
      document.documentElement.style.inset = "";
      document.documentElement.style.zIndex = "";
      document.documentElement.style.pointerEvents = "";
      document.documentElement.style.background = "";

      document.body.style.position = "";
      document.body.style.inset = "";
      document.body.style.zIndex = "";
      document.body.style.pointerEvents = "";
      document.body.style.background = "";

      const nextDiv = document.getElementById("__next");
      if (nextDiv) {
        nextDiv.style.position = "";
        nextDiv.style.inset = "";
        nextDiv.style.zIndex = "";
        nextDiv.style.pointerEvents = "";
        nextDiv.style.background = "";
      }
    }
  }, [router.pathname]);
  // NEW - Add condition to exclude upload page:
  useEffect(() => {
    // ✅ CRITICAL: Only apply overrides to shorts PLAYER, not upload page
    const isShortsPlayer =
      router.pathname === "/shorts" || router.pathname === "/shorts/";
    const isShortsUpload = router.pathname === "/shorts/upload";

    if (isShortsPlayer && !isShortsUpload) {
      console.log("🎬 Applying shorts player overrides...");

      document.documentElement.style.position = "fixed";
      document.documentElement.style.inset = "0";
      document.documentElement.style.zIndex = "0";
      document.documentElement.style.pointerEvents = "none";
      document.documentElement.style.background = "transparent";

      document.body.style.position = "fixed";
      document.body.style.inset = "0";
      document.body.style.zIndex = "0";
      document.body.style.pointerEvents = "none";
      document.body.style.background = "transparent";

      const nextDiv = document.getElementById("__next");
      if (nextDiv) {
        nextDiv.style.position = "fixed";
        nextDiv.style.inset = "0";
        nextDiv.style.zIndex = "0";
        nextDiv.style.pointerEvents = "none";
        nextDiv.style.background = "transparent";
      }

      console.log("✅ Shorts player overrides applied");
    } else {
      // ✅ Reset when leaving shorts player OR on upload page
      document.documentElement.style.position = "";
      document.documentElement.style.inset = "";
      document.documentElement.style.zIndex = "";
      document.documentElement.style.pointerEvents = "";
      document.documentElement.style.background = "";

      document.body.style.position = "";
      document.body.style.inset = "";
      document.body.style.zIndex = "";
      document.body.style.pointerEvents = "";
      document.body.style.background = "";

      const nextDiv = document.getElementById("__next");
      if (nextDiv) {
        nextDiv.style.position = "";
        nextDiv.style.inset = "";
        nextDiv.style.zIndex = "";
        nextDiv.style.pointerEvents = "";
        nextDiv.style.background = "";
      }
    }
  }, [router.pathname]);

  // ============================================================================
  // LOADING SPINNER WHILE THEME INITIALIZES OR AUTH CHECKS
  // ============================================================================
  if (!isThemeReady || isAuthChecking) {
    const currentTheme =
      typeof window !== "undefined" ? getStoredTheme() : "dark";
    const backgroundColor = currentTheme === "dark" ? "#0f0f0f" : "#ffffff";
    const spinnerBorderColor = currentTheme === "dark" ? "#ffffff" : "#0f0f0f";

    return (
      <div
        className="flex flex-col items-center justify-center h-screen gap-4"
        style={{ backgroundColor }}
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
          style={{ borderColor: spinnerBorderColor }}
        />
        <p className="text-sm" style={{ color: spinnerBorderColor }}>
          {!isThemeReady ? "Initializing..." : "Checking authentication..."}
        </p>
      </div>
    );
  }

  // ============================================================================
  // RENDER PAGES WITHOUT LAYOUT (Shorts, Calls, Auth pages)
  // ============================================================================
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
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="black-translucent"
          />
          <title>YouTube Clone</title>
        </Head>

        <Component {...pageProps} />

        <Toaster />
        <CallNotification />
      </>
    );
  }
  // ============================================================================
  // MAIN APP LAYOUT WITH HEADER, SIDEBAR, AND CONTENT AREA
  // ============================================================================
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"
        />
        <title>YouTube Clone</title>
      </Head>

      <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-[#0f0f0f]">
        <Header onMenuClick={openMobileSidebar} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            isMobileOpen={showMobileSidebar}
            onMobileClose={closeMobileSidebar}
          />

          {/* ✅ FIXED: Direct theme-aware classes instead of CSS variable */}
          <main className="flex-1 overflow-y-auto bg-white dark:bg-[#0f0f0f] pb-16 md:pb-0">
            <Component {...pageProps} />
          </main>
        </div>
      </div>

      {/* ✅ FIXED: Moved OUTSIDE the flex container */}
      {shouldShowMobileNav && <MobileBottomNav />}

      <Toaster />
      <CallNotification />
    </>
  );
}
// ============================================================================
// APP EXPORT WITH ALL PROVIDERS
// ============================================================================
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
