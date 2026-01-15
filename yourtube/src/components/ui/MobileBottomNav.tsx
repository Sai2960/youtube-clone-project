/* eslint-disable react-hooks/exhaustive-deps */
// src/components/ui/MobileBottomNav.tsx - GUARANTEED FIX

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Home, PlusCircle, Folder, User } from "lucide-react";
import { useUser } from "@/lib/AuthContext";

const MobileBottomNav: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const [isDark, setIsDark] = useState<boolean | null>(null); // null = not yet determined

  // Detect dark mode from multiple sources
  useEffect(() => {
    const checkDarkMode = () => {
      // 1. Check localStorage (most apps store theme preference here)
      const storedTheme =
        localStorage.getItem("theme") ||
        localStorage.getItem("color-theme") ||
        localStorage.getItem("darkMode");

      if (storedTheme === "dark") {
        setIsDark(true);
        return;
      }
      if (storedTheme === "light") {
        setIsDark(false);
        return;
      }

      // 2. Check data-theme attribute
      const dataTheme =
        document.documentElement.getAttribute("data-theme") ||
        document.body.getAttribute("data-theme");
      if (dataTheme === "dark") {
        setIsDark(true);
        return;
      }
      if (dataTheme === "light") {
        setIsDark(false);
        return;
      }

      // 3. Check for .dark class
      if (
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark")
      ) {
        setIsDark(true);
        return;
      }

      // 4. Check for .light class (explicit light mode)
      if (
        document.documentElement.classList.contains("light") ||
        document.body.classList.contains("light")
      ) {
        setIsDark(false);
        return;
      }

      // 5. Check CSS variable (if your app uses --theme or similar)
      const computedBg = getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-primary")
        .trim();
      if (computedBg) {
        // If bg-primary is dark color, it's dark mode
        const isDarkBg =
          computedBg === "#0f0f0f" ||
          computedBg === "#000000" ||
          computedBg === "#121212" ||
          computedBg === "#1a1a1a";
        setIsDark(isDarkBg);
        return;
      }

      // 6. Check actual background color of body/main content
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      if (bodyBg) {
        // Parse RGB values
        const match = bodyBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const [, r, g, b] = match.map(Number);
          // If average is low, it's dark
          const brightness = (r + g + b) / 3;
          setIsDark(brightness < 128);
          return;
        }
      }

      // 7. Fallback: Check system preference (LAST RESORT)
      // setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);

      // 8. DEFAULT TO LIGHT MODE if nothing else detected
      setIsDark(false);
    };

    // Initial check
    checkDarkMode();

    // Re-check periodically (in case theme changes)
    const interval = setInterval(checkDarkMode, 500);

    // Watch for class changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    // Watch for storage changes
    window.addEventListener("storage", checkDarkMode);

    return () => {
      clearInterval(interval);
      observer.disconnect();
      window.removeEventListener("storage", checkDarkMode);
    };
  }, []);

  // Theme colors - DEFAULT TO LIGHT if not determined yet
  const isCurrentlyDark = isDark === true;

  const colors = {
    bg: isCurrentlyDark ? "#0f0f0f" : "#ffffff",
    border: isCurrentlyDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    iconActive: isCurrentlyDark ? "#ffffff" : "#0f0f0f",
    iconInactive: isCurrentlyDark ? "#aaaaaa" : "#606060",
    textActive: isCurrentlyDark ? "#ffffff" : "#0f0f0f",
    textInactive: isCurrentlyDark ? "#aaaaaa" : "#606060",
  };

  const navItems = [
    { icon: Home, label: "Home", path: "/", filled: false },
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

  // Debug log (remove in production)
  useEffect(() => {
    console.log("🎨 MobileBottomNav theme:", isDark ? "DARK" : "LIGHT", {
      isDark,
      colors,
    });
  }, [isDark]);

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
        style={{ height: "56px", padding: "0 4px" }}
      >
        {navItems.map((item, index) => {
          const active = isActive(item.path);

          if (item.isUpload) {
            const Icon = item.icon as any;
            return (
              <Link key={index} href={item.path}>
                <div className="flex flex-col items-center justify-center w-14 h-14">
                  <Icon size={28} strokeWidth={1.5} color={colors.iconActive} />
                </div>
              </Link>
            );
          }

          if (item.isShorts) {
            return (
              <Link key={index} href={item.path}>
                <div className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[64px]">
                  <svg
                    viewBox="0 0 24 24"
                    width={24}
                    height={24}
                    fill={active ? colors.iconActive : "none"}
                    stroke={active ? "none" : colors.iconInactive}
                    strokeWidth={active ? 0 : 2}
                  >
                    <path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25z" />
                  </svg>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 500,
                      color: active ? colors.textActive : colors.textInactive,
                    }}
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
                  color={active ? colors.iconActive : colors.iconInactive}
                  fill={active && item.filled ? colors.iconActive : "none"}
                />
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 500,
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
