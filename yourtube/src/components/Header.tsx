// src/components/Header.tsx - COMPLETE FIXED VERSION WITH AVATAR REFRESH

import { Crown, Menu, Mic, Search, User, Moon, Sun } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { toggleTheme, getStoredTheme } from "@/lib/theme";
import { getImageUrl } from "@/lib/imageUtils";

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout, handlegooglesignin } = useUser();
  const { subscription } = useSubscription();
  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('dark');
  const [isMounted, setIsMounted] = useState(false);
  const [showSearchMobile, setShowSearchMobile] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now()); // ✅ ADDED
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    setCurrentTheme(getStoredTheme());
  }, []);

  // ✅ ADDED: Listen for avatar updates
  useEffect(() => {
    const handleAvatarUpdate = () => {
      console.log('🔄 Avatar update detected, refreshing...');
      setAvatarKey(Date.now());
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    window.addEventListener('storage', handleAvatarUpdate);

    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
      window.removeEventListener('storage', handleAvatarUpdate);
    };
  }, []);

  const isPremiumPlan = (planType: string | undefined) => {
    return ['gold', 'silver', 'bronze', 'premium', 'monthly', 'yearly'].includes(
      planType?.toLowerCase() || ''
    );
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchMobile(false);
    }
  };

  const handleKeypress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleThemeToggle = () => {
    const newTheme = toggleTheme();
    setCurrentTheme(newTheme);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 bg-youtube-primary border-b border-youtube">
        {/* Left Section - Menu + Logo */}
        <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMenuClick}
            className="h-10 w-10 hover:bg-youtube-hover rounded-full p-0 flex-shrink-0"
          >
            <Menu className="w-6 h-6 text-youtube-primary" />
          </Button>

          <Link href="/" className="flex items-center gap-1 flex-shrink-0">
            <svg className="h-5 w-auto" viewBox="0 0 90 20" fill="none">
              <g>
                <path d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 0 14.285 0 14.285 0C14.285 0 5.35042 0 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C0 5.35042 0 10 0 10C0 10 0 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5677 5.35042 27.9727 3.12324Z" fill="#FF0000"/>
                <path d="M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z" fill="white"/>
              </g>
              <g className="youtube-text">
                <path d="M34.6024 13.0036L31.3945 1.41846H34.1932L35.3174 6.6701C35.6043 7.96361 35.8136 9.06662 35.95 9.97913H36.0323C36.1264 9.32532 36.3381 8.22937 36.665 6.68892L37.8291 1.41846H40.6278L37.3799 13.0036V18.561H34.6001V13.0036H34.6024Z" fill="currentColor" className="text-youtube-primary"/>
                <path d="M41.4697 18.1937C40.9053 17.8127 40.5031 17.22 40.2632 16.4157C40.0257 15.6114 39.9058 14.5437 39.9058 13.2078V11.3898C39.9058 10.0422 40.0422 8.95805 40.315 8.14196C40.5878 7.32588 41.0135 6.72851 41.592 6.35457C42.1706 5.98063 42.9302 5.79248 43.871 5.79248C44.7976 5.79248 45.5384 5.98298 46.0981 6.36398C46.6555 6.74497 47.0508 7.34234 47.2907 8.15137C47.5306 8.96275 47.6506 10.0422 47.6506 11.3898V13.2078C47.6506 14.5437 47.5306 15.6161 47.2931 16.4251C47.0531 17.2365 46.6508 17.8292 46.0886 18.2031C45.5264 18.5771 44.7715 18.7652 43.8239 18.7652C42.8551 18.7675 42.0343 18.5747 41.4697 18.1937ZM44.6353 16.2323C44.7905 15.8231 44.8705 15.1575 44.8705 14.2309V10.3292C44.8705 9.43077 44.7929 8.77225 44.6353 8.35833C44.4777 7.94206 44.2026 7.7351 43.8074 7.7351C43.4265 7.7351 43.156 7.94206 42.9972 8.35833C42.8384 8.77461 42.7584 9.43077 42.7584 10.3292V14.2309C42.7584 15.1575 42.8314 15.8254 42.9778 16.2323C43.1242 16.6415 43.3922 16.8461 43.7851 16.8461C44.1638 16.8461 44.4265 16.6415 44.6353 16.2323Z" fill="currentColor" className="text-youtube-primary"/>
                <path d="M56.8154 18.5634H54.6094L54.3648 17.03H54.3037C53.7039 18.1871 52.8055 18.7656 51.6061 18.7656C50.7759 18.7656 50.1621 18.4928 49.767 17.9496C49.3719 17.4039 49.1743 16.5526 49.1743 15.3955V6.03751H51.9942V15.2308C51.9942 15.7906 52.0553 16.188 52.1776 16.4256C52.2999 16.6631 52.5045 16.783 52.7914 16.783C53.036 16.783 53.2712 16.7078 53.497 16.5573C53.7228 16.4067 53.8874 16.2162 53.9979 15.9858V6.03516H56.8154V18.5634Z" fill="currentColor" className="text-youtube-primary"/>
                <path d="M64.4755 3.68758H61.6768V18.5629H58.9181V3.68758H56.1194V1.42041H64.4755V3.68758Z" fill="currentColor" className="text-youtube-primary"/>
                <path d="M71.2768 18.5634H69.0708L68.8262 17.03H68.7651C68.1654 18.1871 67.267 18.7656 66.0675 18.7656C65.2373 18.7656 64.6235 18.4928 64.2284 17.9496C63.8333 17.4039 63.6357 16.5526 63.6357 15.3955V6.03751H66.4556V15.2308C66.4556 15.7906 66.5167 16.188 66.639 16.4256C66.7613 16.6631 66.9659 16.783 67.2529 16.783C67.4974 16.783 67.7326 16.7078 67.9584 16.5573C68.1842 16.4067 68.3488 16.2162 68.4593 15.9858V6.03516H71.2768V18.5634Z" fill="currentColor" className="text-youtube-primary"/>
                <path d="M80.609 8.0387C80.4373 7.24849 80.1621 6.67699 79.7812 6.32186C79.4002 5.96674 78.8757 5.79035 78.2078 5.79035C77.6904 5.79035 77.2059 5.93616 76.7567 6.23014C76.3075 6.52412 75.9594 6.90747 75.7148 7.38489H75.6937V0.785645H72.9773V18.5608H75.3056L75.5925 17.3755H75.6537C75.8724 17.7988 76.1993 18.1304 76.6344 18.3774C77.0695 18.622 77.554 18.7443 78.0855 18.7443C79.038 18.7443 79.7412 18.3045 80.1904 17.4272C80.6396 16.5476 80.8653 15.1765 80.8653 13.3092V11.3266C80.8653 9.92722 80.7783 8.82892 80.609 8.0387ZM78.0243 13.1492C78.0243 14.0617 77.9867 14.7767 77.9114 15.2941C77.8362 15.8115 77.7115 16.1808 77.5328 16.3971C77.3564 16.6158 77.1165 16.724 76.8178 16.724C76.585 16.724 76.371 16.6699 76.1734 16.5594C75.9759 16.4512 75.816 16.2866 75.6937 16.0702V8.96062C75.7877 8.6196 75.9524 8.34209 76.1852 8.12337C76.4157 7.90465 76.6697 7.79646 76.9401 7.79646C77.2271 7.79646 77.4481 7.90935 77.6034 8.13278C77.7564 8.35855 77.8691 8.73485 77.9303 9.26636C77.9914 9.79787 78.022 10.5528 78.022 11.5335V13.1492H78.0243Z" fill="currentColor" className="text-youtube-primary"/>
                <path d="M84.8657 13.8712C84.8657 14.6755 84.8892 15.2776 84.9363 15.6798C84.9833 16.0819 85.0821 16.3736 85.2326 16.5594C85.3831 16.7428 85.6136 16.8345 85.9264 16.8345C86.3474 16.8345 86.639 16.6699 86.7942 16.343C86.9518 16.0161 87.0365 15.4705 87.0506 14.7085L89.4824 14.8519C89.4965 14.9601 89.5035 15.1106 89.5035 15.3011C89.5035 16.4582 89.186 17.3237 88.5534 17.8952C87.9208 18.4667 87.0247 18.7536 85.8676 18.7536C84.4777 18.7536 83.5251 18.2808 82.9961 17.3331C82.4694 16.3854 82.2061 14.9077 82.2061 12.9038V10.3969C82.2061 8.3623 82.4765 6.87025 83.0172 5.91254C83.5603 4.95484 84.5242 4.47598 85.9124 4.47598C86.8257 4.47598 87.5406 4.68479 88.0572 5.10241C88.5738 5.52002 88.9265 6.13484 89.1159 6.93913C89.3052 7.74576 89.4 8.80041 89.4 10.1038V12.5617H84.8657V13.8712ZM85.2232 7.96811C85.0797 8.14449 84.9857 8.43377 84.9363 8.83593C84.8892 9.2381 84.8657 9.84722 84.8657 10.6657V11.2250H86.9283V10.6657C86.9283 9.86275 86.9001 9.25363 86.846 8.83593C86.7919 8.41823 86.6931 8.12895 86.5496 7.95728C86.4062 7.78562 86.1851 7.69978 85.8864 7.69978C85.5854 7.69978 85.3643 7.78562 85.2232 7.96811Z" fill="currentColor" className="text-youtube-primary"/>
              </g>
            </svg>
            <span className="text-[10px] text-youtube-secondary font-medium">IN</span>
          </Link>
        </div>

        {/* Center Section - Search (Desktop) */}
        <div className="hidden md:flex items-center gap-3 flex-1 max-w-2xl mx-4">
          <div className="flex flex-1 items-stretch h-10 border border-youtube rounded-full overflow-hidden hover:border-blue-500 focus-within:border-blue-500 transition-colors">
            <Input
              type="search"
              placeholder="Search"
              value={searchQuery}
              onKeyPress={handleKeypress}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-full flex-1 rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-youtube-primary placeholder:text-youtube-secondary px-4 text-base"
            />
            <button
              onClick={handleSearch}
              className="h-full w-16 bg-youtube-hover hover:bg-youtube-tertiary border-l border-youtube flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Search className="w-5 h-5 text-youtube-primary" />
            </button>
          </div>
          <Button 
            type="button"
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-full hover:bg-youtube-hover flex-shrink-0 bg-youtube-hover"
          >
            <Mic className="w-5 h-5 text-youtube-primary" />
          </Button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowSearchMobile(!showSearchMobile)}
            className="md:hidden h-10 w-10 hover:bg-youtube-hover rounded-full"
          >
            <Search className="w-5 h-5 text-youtube-primary" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleThemeToggle} 
            title="Toggle theme"
            className="h-10 w-10 rounded-full hover:bg-youtube-hover"
          >
            {currentTheme === 'dark' ? (
              <Sun className="w-5 h-5 text-youtube-primary" />
            ) : (
              <Moon className="w-5 h-5 text-youtube-primary" />
            )}
          </Button>

          <Link href="/subscription" className="hidden lg:flex">
            <Button variant="ghost" className="h-10 flex items-center gap-2 hover:bg-youtube-hover text-youtube-primary px-3 rounded-full">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-medium">Premium</span>
              {isPremiumPlan(subscription?.planType) && (
                <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-200 font-semibold uppercase">
                  {subscription?.planType}
                </span>
              )}
            </Button>
          </Link>

          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full p-0"
                  >
                    {/* ✅ FIXED: Added key prop for force refresh */}
                    <Avatar className="h-9 w-9" key={`header-avatar-${avatarKey}`}>
                      <AvatarImage 
                        src={getImageUrl(user.image, true)}
                      />
                      <AvatarFallback className="bg-youtube-hover text-youtube-primary text-sm font-semibold">
                        {user.name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-youtube-secondary border-youtube" align="end" forceMount>
                  {user?.channelname ? (
                    <DropdownMenuItem asChild className="text-youtube-primary hover:bg-youtube-hover cursor-pointer">
                      <Link href={`/channel/${user?._id}`} className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Your channel
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setisdialogeopen(true)} className="text-youtube-primary hover:bg-youtube-hover cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Create Channel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-youtube" />
                  
                  <div className="md:hidden">
                    <DropdownMenuItem onClick={handleThemeToggle} className="text-youtube-primary hover:bg-youtube-hover cursor-pointer">
                      {currentTheme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                      Toggle Theme
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-youtube" />
                  </div>

                  <DropdownMenuItem asChild className="text-youtube-primary hover:bg-youtube-hover cursor-pointer">
                    <Link href="/subscription" className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      Premium
                      {isPremiumPlan(subscription?.planType) && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded ml-auto dark:bg-yellow-900 dark:text-yellow-200 font-semibold">
                          {subscription?.planType?.toUpperCase()}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-youtube" />
                  <DropdownMenuItem asChild className="text-youtube-primary hover:bg-youtube-hover cursor-pointer">
                    <Link href="/history">History</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-youtube-primary hover:bg-youtube-hover cursor-pointer">
                    <Link href="/liked">Liked videos</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-youtube-primary hover:bg-youtube-hover cursor-pointer">
                    <Link href="/watch-later">Watch later</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-youtube" />
                  <DropdownMenuItem onClick={logout} className="text-youtube-primary hover:bg-youtube-hover cursor-pointer">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              className="flex items-center gap-2 h-9 text-sm bg-transparent hover:bg-blue-500/10 text-primary border border-blue-500 px-3 rounded-full"
              onClick={handlegooglesignin}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Sign in</span>
            </Button>
          )}
        </div>
      </header>

      {showSearchMobile && (
        <div className="md:hidden bg-youtube-primary border-b border-youtube p-2 sticky top-14 z-40">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-stretch h-10 border border-youtube rounded-full overflow-hidden">
              <Input
                type="search"
                placeholder="Search"
                value={searchQuery}
                onKeyPress={handleKeypress}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full flex-1 rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-youtube-primary placeholder:text-youtube-secondary px-4 text-base"
                autoFocus
              />
              <button
                onClick={handleSearch}
                className="h-full w-12 bg-youtube-hover hover:bg-youtube-tertiary border-l border-youtube flex items-center justify-center"
              >
                <Search className="w-5 h-5 text-youtube-primary" />
              </button>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full hover:bg-youtube-hover flex-shrink-0"
              onClick={() => setShowSearchMobile(false)}
            >
              <span className="text-youtube-primary text-xl">✕</span>
            </Button>
          </div>
        </div>
      )}

      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </>
  );
};

export default Header;