// src/components/ui/MobileBottomNav.tsx - COMPLETE MERGED VERSION

import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Home, PlusCircle, Folder, User } from "lucide-react";
import { useUser } from "@/lib/AuthContext";

const MobileBottomNav: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
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
      path: "/subscriptions", // ✅ Direct path to subscriptions page (no login check)
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
    <>
      {/* Bottom Navigation - FIXED POSITIONING */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-youtube-primary border-t border-youtube"
        style={{
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
                        className="text-youtube-primary"
                        strokeWidth={1.5}
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
                        className={`w-6 h-6 ${
                          active
                            ? "fill-youtube-primary"
                            : "fill-none stroke-youtube-primary stroke-2"
                        }`}
                      >
                        <path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25z" />
                      </svg>
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        active
                          ? "text-youtube-primary"
                          : "text-youtube-secondary"
                      }`}
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
                    className={
                      active ? "text-youtube-primary" : "text-youtube-secondary"
                    }
                    strokeWidth={2}
                    fill={active && item.filled ? "currentColor" : "none"}
                  />
                  <span
                    className={`text-[10px] font-medium ${
                      active ? "text-youtube-primary" : "text-youtube-secondary"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
