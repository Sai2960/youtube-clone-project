// src/components/ui/MobileBottomNav.tsx - FIXED VERSION

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Home, PlusCircle, Folder, User } from "lucide-react";
import { useUser } from "@/lib/AuthContext";

const MobileBottomNav: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  
  const [isDark, setIsDark] = useState(true); // Default to dark

  // Detect theme from DOM - more robust detection
  const detectTheme = useCallback(() => {
    if (typeof window === "undefined") return true;
    
    // Check multiple sources for theme
    const html = document.documentElement;
    const body = document.body;
    
    // Priority 1: Check localStorage
    const stored = localStorage.getItem("theme");
    if (stored === "light") return false;
    if (stored === "dark") return true;
    
    // Priority 2: Check data-theme attribute
    const dataTheme = html.getAttribute("data-theme") || body.getAttribute("data-theme");
    if (dataTheme === "light") return false;
    if (dataTheme === "dark") return true;
    
    // Priority 3: Check class on html/body
    if (html.classList.contains("light") || body.classList.contains("light")) return false;
    if (html.classList.contains("dark") || body.classList.contains("dark")) return true;
    
    // Priority 4: Check CSS custom property
    const bgPrimary = getComputedStyle(html).getPropertyValue("--bg-primary").trim();
    if (bgPrimary === "#ffffff" || bgPrimary === "white") return false;
    
    // Default to dark
    return true;
  }, []);

  // Update theme state
  const updateTheme = useCallback(() => {
    const newIsDark = detectTheme();
    setIsDark(newIsDark);
  }, [detectTheme]);

  // Initial detection + watchers
  useEffect(() => {
    // Initial detection
    updateTheme();

    // Watch for class/attribute changes on html element
    const observer = new MutationObserver(() => {
      updateTheme();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });

    // Also observe body
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });

    // Listen for storage changes
    const handleStorage = () => updateTheme();
    window.addEventListener("storage", handleStorage);

    // Listen for custom theme change event
    const handleThemeEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.theme) {
        setIsDark(customEvent.detail.theme === "dark");
      }
    };
    window.addEventListener("themeChanged", handleThemeEvent);

    // Periodic check as fallback (every 500ms for 5 seconds after mount)
    let checkCount = 0;
    const intervalId = setInterval(() => {
      updateTheme();
      checkCount++;
      if (checkCount >= 10) {
        clearInterval(intervalId);
      }
    }, 500);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("themeChanged", handleThemeEvent);
      clearInterval(intervalId);
    };
  }, [updateTheme]);

  const navItems = [
    {
      icon: Home,
      label: "Home",
      path: "/",
      filled: false,
    },
    {
      icon: "shorts",
      label: "Shorts",
      path: "/shorts",
      filled: true,
      isShorts: true,
    },
    {
      icon: PlusCircle,
      label: "",
      path: user ? "/upload" : "/login",
      isUpload: true,
    },
    {
      icon: Folder,
      label: "Subscriptions",
      path: "/subscriptions",
      filled: false,
    },
    {
      icon: User,
      label: "You",
      path: user?._id ? `/channel/${user._id}` : "/login",
      filled: false,
    },
  ];

  const isActive = (path: string) => {
    if (path === "/" && router.pathname === "/") return true;
    if (path !== "/" && router.pathname.startsWith(path)) return true;
    if (
      user?._id &&
      path === `/channel/${user._id}` &&
      router.pathname.startsWith("/channel/")
    ) {
      return router.query.id === user._id;
    }
    return false;
  };

  // Theme-aware colors
  const bgColor = isDark ? "#0f0f0f" : "#ffffff";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  const activeIconColor = isDark ? "#ffffff" : "#0f0f0f";
  const inactiveIconColor = isDark ? "#aaaaaa" : "#606060";
  const activeTextColor = isDark ? "#ffffff" : "#0f0f0f";
  const inactiveTextColor = isDark ? "#aaaaaa" : "#606060";

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
        style={{
          height: "56px",
          padding: "0 4px",
        }}
      >
        {navItems.map((item, index) => {
          const active = isActive(item.path);
          const iconColor = active ? activeIconColor : inactiveIconColor;
          const textColor = active ? activeTextColor : inactiveTextColor;

          // Upload button
          if (item.isUpload) {
            const Icon = item.icon as any;
            return (
              <Link key={index} href={item.path}>
                <div className="flex flex-col items-center justify-center w-14 h-14">
                  <Icon
                    size={28}
                    strokeWidth={1.5}
                    style={{ color: iconColor }}
                  />
                </div>
              </Link>
            );
          }

          // Shorts icon
          if (item.isShorts) {
            return (
              <Link key={index} href={item.path}>
                <div className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[64px]">
                  <div className="relative flex items-center justify-center w-6 h-6">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-6 h-6"
                      style={{
                        fill: active ? iconColor : "none",
                        stroke: active ? "none" : iconColor,
                        strokeWidth: active ? 0 : 2,
                      }}
                    >
                      <path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25z" />
                    </svg>
                  </div>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: textColor }}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          }

          // Regular nav items
          const Icon = item.icon as any;
          return (
            <Link key={index} href={item.path}>
              <div className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[64px]">
                <Icon
                  size={24}
                  strokeWidth={2}
                  fill={active && item.filled ? "currentColor" : "none"}
                  style={{ color: iconColor }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: textColor }}
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
