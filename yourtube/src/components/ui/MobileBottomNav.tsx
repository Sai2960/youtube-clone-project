// src/components/ui/MobileBottomNav.tsx - FIXED VERSION

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Home, PlusCircle, Folder, User } from "lucide-react";
import { useUser } from "@/lib/AuthContext";

const MobileBottomNav: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  
  // Initialize with correct theme immediately
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'light') return false;
      if (stored === 'dark') return true;
      return document.documentElement.classList.contains('dark');
    } catch {
      return true;
    }
  });

  // Theme detection function
  const checkTheme = useCallback(() => {
    const stored = localStorage.getItem('theme');
    const dataTheme = document.documentElement.getAttribute('data-theme');
    const hasLightClass = document.documentElement.classList.contains('light');
    const hasDarkClass = document.documentElement.classList.contains('dark');
    
    // Priority: localStorage > data-theme > class
    if (stored === 'light' || dataTheme === 'light' || (hasLightClass && !hasDarkClass)) {
      setIsDark(false);
    } else {
      setIsDark(true);
    }
  }, []);

  // Check theme on mount and after hydration
  useEffect(() => {
    checkTheme();
    
    // Re-check after a small delay for hydration
    const timeoutId = setTimeout(checkTheme, 50);
    const timeoutId2 = setTimeout(checkTheme, 200);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, [checkTheme]);

  // Watch for theme changes via MutationObserver
  useEffect(() => {
    const observer = new MutationObserver(() => {
      checkTheme();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    });

    return () => observer.disconnect();
  }, [checkTheme]);

  // Watch for localStorage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'theme') {
        checkTheme();
      }
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [checkTheme]);

  // Watch for route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setTimeout(checkTheme, 100);
    };
    
    router.events?.on('routeChangeComplete', handleRouteChange);
    return () => router.events?.off('routeChangeComplete', handleRouteChange);
  }, [router.events, checkTheme]);

  // Theme colors - HARDCODED for reliability
  const bgColor = isDark ? "#0f0f0f" : "#ffffff";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  const iconActiveColor = isDark ? "#ffffff" : "#0f0f0f";
  const iconInactiveColor = isDark ? "#aaaaaa" : "#606060";
  const textActiveColor = isDark ? "#ffffff" : "#0f0f0f";
  const textInactiveColor = isDark ? "#aaaaaa" : "#606060";

  const navItems = [
    { icon: Home, label: "Home", path: "/", filled: false },
    { icon: "shorts", label: "Shorts", path: "/shorts", filled: true, isShorts: true },
    { icon: PlusCircle, label: "", path: user ? "/upload" : "/login", isUpload: true },
    { icon: Folder, label: "Subscriptions", path: "/subscriptions", filled: false },
    { icon: User, label: "You", path: user?._id ? `/channel/${user._id}` : "/login", filled: false },
  ];

  const isActive = (path: string) => {
    if (path === "/" && router.pathname === "/") return true;
    if (path !== "/" && router.pathname.startsWith(path)) return true;
    if (user?._id && path === `/channel/${user._id}` && router.pathname.startsWith("/channel/")) {
      return router.query.id === user._id;
    }
    return false;
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        backgroundColor: bgColor,
        borderTop: `1px solid ${borderColor}`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        className="flex items-center justify-around"
        style={{ height: "56px", padding: "0 4px" }}
      >
        {navItems.map((item, index) => {
          const active = isActive(item.path);

          if (item.isUpload) {
            const Icon = item.icon as any;
            return (
              <Link key={index} href={item.path}>
                <div className="flex flex-col items-center justify-center w-14 h-14">
                  <Icon size={28} strokeWidth={1.5} style={{ color: iconActiveColor }} />
                </div>
              </Link>
            );
          }

          if (item.isShorts) {
            return (
              <Link key={index} href={item.path}>
                <div className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[64px]">
                  <div className="relative flex items-center justify-center w-6 h-6">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-6 h-6"
                      style={{
                        fill: active ? iconActiveColor : "none",
                        stroke: active ? "none" : iconInactiveColor,
                        strokeWidth: active ? 0 : 2,
                      }}
                    >
                      <path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25z" />
                    </svg>
                  </div>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: active ? textActiveColor : textInactiveColor }}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          }

          const Icon = item.icon as any;
          return (
            <Link key={index} href={item.path}>
              <div className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[64px]">
                <Icon
                  size={24}
                  strokeWidth={2}
                  fill={active && item.filled ? "currentColor" : "none"}
                  style={{ color: active ? iconActiveColor : iconInactiveColor }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: active ? textActiveColor : textInactiveColor }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
