// src/components/ui/MobileBottomNav.tsx - COMPLETELY FIXED VERSION

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Home, PlusCircle, Folder, User } from "lucide-react";
import { useUser } from "@/lib/AuthContext";

const MobileBottomNav: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      // Check multiple sources for dark mode
      const htmlHasDark = document.documentElement.classList.contains("dark");
      const bodyHasDark = document.body.classList.contains("dark");
      const dataTheme = document.documentElement.getAttribute("data-theme");
      const storedTheme = localStorage.getItem("theme");

      // Priority: data-theme attribute > localStorage > class > system preference
      if (dataTheme === "light" || storedTheme === "light") {
        setIsDark(false);
        return;
      }
      if (dataTheme === "dark" || storedTheme === "dark") {
        setIsDark(true);
        return;
      }

      const isDarkMode = htmlHasDark || bodyHasDark;
      setIsDark(isDarkMode);
    };

    // Initial check
    checkDarkMode();

    // Small delay to catch theme changes after hydration
    const timeoutId = setTimeout(checkDarkMode, 100);

    // Watch for class changes on html/body
    const observer = new MutationObserver(() => {
      checkDarkMode();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    // Watch for localStorage changes (cross-tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "theme") {
        checkDarkMode();
      }
    };
    window.addEventListener("storage", handleStorage);

    // Watch for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkDarkMode);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      mediaQuery.removeEventListener("change", checkDarkMode);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Listen for custom theme change events
  useEffect(() => {
    const handleThemeChange = () => {
      const storedTheme = localStorage.getItem("theme");
      const dataTheme = document.documentElement.getAttribute("data-theme");
      setIsDark(dataTheme === "dark" || storedTheme === "dark");
    };

    // Re-check on route change
    router.events?.on("routeChangeComplete", handleThemeChange);

    return () => {
      router.events?.off("routeChangeComplete", handleThemeChange);
    };
  }, [router.events]);

  // Theme colors
  const colors = {
    bg: isDark ? "#0f0f0f" : "#ffffff",
    border: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    iconActive: isDark ? "#ffffff" : "#0f0f0f",
    iconInactive: isDark ? "#aaaaaa" : "#606060",
    textActive: isDark ? "#ffffff" : "#0f0f0f",
    textInactive: isDark ? "#aaaaaa" : "#606060",
  };

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

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        backgroundColor: colors.bg,
        borderTop: `1px solid ${colors.border}`,
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

          // Special styling for Upload button
          if (item.isUpload) {
            const Icon = item.icon as any;
            return (
              <Link key={index} href={item.path}>
                <div className="flex flex-col items-center justify-center w-14 h-14">
                  <div className="relative">
                    <Icon
                      size={28}
                      strokeWidth={1.5}
                      style={{ color: colors.iconActive }}
                    />
                  </div>
                </div>
              </Link>
            );
          }

          // Shorts icon special styling
          if (item.isShorts) {
            return (
              <Link key={index} href={item.path}>
                <div className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[64px]">
                  <div className="relative flex items-center justify-center w-6 h-6">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-6 h-6"
                      style={{
                        fill: active ? colors.iconActive : "none",
                        stroke: active ? "none" : colors.iconInactive,
                        strokeWidth: active ? 0 : 2,
                      }}
                    >
                      <path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25z" />
                    </svg>
                  </div>
                  <span
                    className="text-[10px] font-medium"
                    style={{
                      color: active ? colors.textActive : colors.textInactive,
                    }}
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
                  style={{
                    color: active ? colors.iconActive : colors.iconInactive,
                  }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{
                    color: active ? colors.textActive : colors.textInactive,
                  }}
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
