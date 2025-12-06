// src/components/Sidebar.tsx - FIXED & ALIGNED

import {
  Home,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Crown,
  Download,
  X,
} from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileClose }) => {
  const { user } = useUser();
  const { subscription } = useSubscription();
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLinkClick = () => {
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  const isPremiumPlan = (planType: string | undefined) => {
    return ['gold', 'silver', 'bronze', 'premium', 'monthly', 'yearly'].includes(
      planType?.toLowerCase() || ''
    );
  };

  const sidebarContent = (
    <nav className="space-y-1 p-2">
      <Link href="/" onClick={handleLinkClick}>
        <Button variant="ghost" className="w-full justify-start text-youtube-primary hover:bg-youtube-hover rounded-lg">
          <Home className="w-5 h-5 mr-3" />
          Home
        </Button>
      </Link>
      
      <Link href="/shorts" onClick={handleLinkClick}>
        <Button variant="ghost" className="w-full justify-start text-youtube-primary hover:bg-youtube-hover rounded-lg">
          <PlaySquare className="w-5 h-5 mr-3" />
          Shorts
        </Button>
      </Link>
      
      <Link href="/subscription" onClick={handleLinkClick}>
        <Button variant="ghost" className="w-full justify-start text-youtube-primary hover:bg-youtube-hover rounded-lg">
          <PlaySquare className="w-5 h-5 mr-3" />
          Subscriptions
        </Button>
      </Link>

      <div className="border-t border-youtube pt-2 mt-2">
        <Link href="/subscription" onClick={handleLinkClick}>
          <Button variant="ghost" className="w-full justify-start text-youtube-primary hover:bg-youtube-hover rounded-lg">
            <Crown className="w-5 h-5 mr-3" />
            Premium
            {!isPremiumPlan(subscription?.planType) && (
              <span className="ml-auto bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs px-2 py-0.5 rounded-full font-medium">
                Upgrade
              </span>
            )}
            {isPremiumPlan(subscription?.planType) && (
              <span className="ml-auto bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs px-2 py-0.5 rounded-full font-semibold">
                {subscription?.planType?.toUpperCase()}
              </span>
            )}
          </Button>
        </Link>
      </div>

      {user && (
        <>
          <div className="border-t border-youtube pt-2 mt-2">
            <Link href="/history" onClick={handleLinkClick}>
              <Button variant="ghost" className="w-full justify-start text-youtube-primary hover:bg-youtube-hover rounded-lg">
                <History className="w-5 h-5 mr-3" />
                History
              </Button>
            </Link>
            <Link href="/liked" onClick={handleLinkClick}>
              <Button variant="ghost" className="w-full justify-start text-youtube-primary hover:bg-youtube-hover rounded-lg">
                <ThumbsUp className="w-5 h-5 mr-3" />
                Liked videos
              </Button>
            </Link>
            <Link href="/watch-later" onClick={handleLinkClick}>
              <Button variant="ghost" className="w-full justify-start text-youtube-primary hover:bg-youtube-hover rounded-lg">
                <Clock className="w-5 h-5 mr-3" />
                Watch later
              </Button>
            </Link>

            <Link href="/downloads" onClick={handleLinkClick}>
              <Button variant="ghost" className="w-full justify-start text-youtube-primary hover:bg-youtube-hover rounded-lg">
                <Download className="w-5 h-5 mr-3" />
                Downloads
                {isPremiumPlan(subscription?.planType) ? (
                  <span className="ml-auto text-xs text-green-600 dark:text-green-400 font-medium">Premium</span>
                ) : (
                  <span className="ml-auto text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {subscription?.dailyDownloads || 0}/1
                  </span>
                )}
              </Button>
            </Link>

            {user?.channelname ? (
              <Link href={`/channel/${user._id}`} onClick={handleLinkClick}>
                <Button variant="ghost" className="w-full justify-start text-youtube-primary hover:bg-youtube-hover rounded-lg">
                  <User className="w-5 h-5 mr-3" />
                  Your channel
                </Button>
              </Link>
            ) : (
              <div className="px-2 py-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full bg-youtube-hover hover:bg-youtube-tertiary text-youtube-primary"
                  onClick={() => setisdialogeopen(true)}
                >
                  Create Channel
                </Button>
              </div>
            )}
          </div>

          {subscription && (
            <div className="border-t border-youtube pt-2 mt-2">
              <div className="px-3 py-3 bg-youtube-hover rounded-lg mx-2">
                <div className="text-xs text-youtube-secondary mb-1.5 font-medium">Your Plan</div>
                <div className="text-sm font-semibold flex items-center gap-2 text-youtube-primary">
                  {isPremiumPlan(subscription.planType) ? (
                    <>
                      <Crown className="w-4 h-4 text-yellow-500" />
                      {subscription.planName || subscription.planType?.toUpperCase()}
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 bg-youtube-tertiary rounded-full"></div>
                      Free Plan
                    </>
                  )}
                </div>
                
                {!isPremiumPlan(subscription.planType) && (
                  <div className="text-xs text-youtube-secondary mt-1.5">
                    Downloads: {subscription.dailyDownloads || 0}/1 today
                  </div>
                )}
                
                {subscription.endDate && isPremiumPlan(subscription.planType) && (
                  <div className="text-xs text-youtube-secondary mt-1.5">
                    Expires: {new Date(subscription.endDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </nav>
  );

  // Mobile Sidebar (Overlay)
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onMobileClose}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full w-64 bg-youtube-primary border-r border-youtube z-50 transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Close Button */}
          <div className="flex items-center justify-between p-4 border-b border-youtube">
            <h2 className="text-lg font-semibold text-youtube-primary">Menu</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMobileClose}
              className="text-youtube-primary hover:bg-youtube-hover"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {sidebarContent}
        </aside>

        <Channeldialogue
          isopen={isdialogeopen}
          onclose={() => setisdialogeopen(false)}
          mode="create"
        />
      </>
    );
  }

  // Desktop Sidebar
  return (
    <aside className="hidden lg:block w-60 border-r border-youtube bg-youtube-primary min-h-screen overflow-y-auto flex-shrink-0">
      {sidebarContent}
      
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </aside>
  );
};

export default Sidebar;