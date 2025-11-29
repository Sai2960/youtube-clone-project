// src/pages/shorts/index.tsx - FULLY MERGED & OPTIMIZED VERSION

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { RefreshCw, ChevronLeft } from "lucide-react";
import ShortPlayer from "@/components/ui/ShortPlayer";
import MobileBottomNav from "@/components/ui/MobileBottomNav";
import Head from "next/head";

// ✅ Force dynamic rendering & disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Short {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  views: number;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  shares: number;
  originalLanguage?: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string | null;
    image?: string | null;
    channelName?: string;
    channelname?: string;
    subscribers?: number;
  };
  channelName: string;
  channelAvatar?: string | null;
  hasLiked?: boolean;
  hasDisliked?: boolean;
  isSubscribed?: boolean;
  createdAt?: string;
}

const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
};

const ShortsPage: React.FC = () => {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ✅ CRITICAL: Navigation throttling refs
  const lastNavigationTimeRef = useRef(0);
  const isNavigatingRef = useRef(false);
  const navigationQueueRef = useRef<'next' | 'prev' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewedShorts = useRef<Set<string>>(new Set());
  const router = useRouter();

  // ✅ Initial fetch
  useEffect(() => {
    fetchShorts(1);
  }, []);

  // ✅ Handle start query parameter
  useEffect(() => {
    if (router.query.start && shorts.length > 0) {
      const startIndex = parseInt(router.query.start as string, 10);
      if (!isNaN(startIndex) && startIndex >= 0 && startIndex < shorts.length) {
        console.log("🎯 Starting at short index:", startIndex);
        setCurrentIndex(startIndex);
        const { start, ...restQuery } = router.query;
        router.replace(
          { pathname: router.pathname, query: restQuery },
          undefined,
          { shallow: true }
        );
      }
    }
  }, [router.query.start, shorts.length]);

  // ✅ Prefetch more shorts when near the end
  useEffect(() => {
    if (currentIndex >= shorts.length - 3 && hasMore && !loading) {
      console.log("📥 Near end, fetching more shorts...");
      fetchShorts(page + 1);
    }
  }, [currentIndex, shorts.length, hasMore, loading, page]);

  // ✅ Track and increment view for current short
  useEffect(() => {
    if (
      shorts[currentIndex] &&
      !viewedShorts.current.has(shorts[currentIndex]._id)
    ) {
      const viewTimer = setTimeout(() => {
        incrementView(shorts[currentIndex]._id);
        viewedShorts.current.add(shorts[currentIndex]._id);
      }, 1000); // 1 second delay before counting view

      return () => clearTimeout(viewTimer);
    }
  }, [currentIndex, shorts]);

  // ✅ Increment view count
  const incrementView = async (shortId: string) => {
    try {
      const token = localStorage.getItem("token");
      const apiUrl = getApiUrl();

      console.log("👁️ Incrementing view for short:", shortId);

      const response = await axios.post(
        `${apiUrl}/api/shorts/${shortId}/view`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (response.data.success) {
        console.log("✅ View counted:", response.data.data.views);
        setShorts((prev) =>
          prev.map((short) =>
            short._id === shortId
              ? { ...short, views: response.data.data.views }
              : short
          )
        );
      }
    } catch (error: any) {
      console.error(
        "❌ Error incrementing view:",
        error.response?.data || error.message
      );
    }
  };

  // ✅ Fetch shorts with proper cache busting
  const fetchShorts = async (pageNum: number) => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const apiUrl = getApiUrl();

      console.log(
        "📡 Fetching shorts:",
        `${apiUrl}/api/shorts?page=${pageNum}&limit=10`
      );

      // ✅ Simplified axios config without problematic headers
      const response = await axios.get(`${apiUrl}/api/shorts`, {
        params: {
          page: pageNum,
          limit: 10,
          _t: Date.now(), // Cache busting timestamp
        },
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      console.log("✅ Shorts response:", response.data);

      if (response.data.success && Array.isArray(response.data.data)) {
        const newShorts = response.data.data;

        if (newShorts.length === 0) {
          setHasMore(false);
        } else {
          setShorts((prev) => {
            const existingIds = new Set(prev.map((s) => s._id));
            const uniqueNewShorts = newShorts.filter(
              (s) => !existingIds.has(s._id)
            );
            return pageNum === 1 ? newShorts : [...prev, ...uniqueNewShorts];
          });
          setPage(pageNum);
        }
      } else {
        setError("Failed to load shorts");
      }
    } catch (error: any) {
      console.error("❌ Error fetching shorts:", error);
      console.error("   Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      setError(
        error.response?.data?.message ||
          "Failed to load shorts. Please try again."
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // ✅ Handle short deletion
  const handleShortDeleted = useCallback(
    (deletedShortId: string) => {
      console.log("🗑️ Removing deleted short:", deletedShortId);
      viewedShorts.current.delete(deletedShortId);

      setShorts((prev) => {
        const filtered = prev.filter((s) => s._id !== deletedShortId);

        if (prev[currentIndex]?._id === deletedShortId) {
          if (currentIndex >= filtered.length && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
          }
        }

        if (filtered.length === 0) {
          setTimeout(() => {
            router.push("/shorts");
          }, 500);
        }

        return filtered;
      });
    },
    [currentIndex, router]
  );

  // ✅ CRITICAL: Throttled navigation with queue system
  const handleNavigation = useCallback(
    (direction: "next" | "prev") => {
      const now = Date.now();
      const timeSinceLastNav = now - lastNavigationTimeRef.current;
      const THROTTLE_MS = 500; // 500ms between navigations

      // If already navigating, queue the request
      if (isNavigatingRef.current) {
        console.log("⏸️ Navigation in progress, queueing:", direction);
        navigationQueueRef.current = direction;
        return;
      }

      // If too soon since last navigation
      if (timeSinceLastNav < THROTTLE_MS) {
        console.log("⏸️ Navigation throttled, waiting...");
        navigationQueueRef.current = direction;

        // Schedule queued navigation
        setTimeout(() => {
          if (navigationQueueRef.current) {
            const queuedDirection = navigationQueueRef.current;
            navigationQueueRef.current = null;
            handleNavigation(queuedDirection);
          }
        }, THROTTLE_MS - timeSinceLastNav);
        return;
      }

      // Execute navigation
      isNavigatingRef.current = true;
      lastNavigationTimeRef.current = now;
      navigationQueueRef.current = null;

      if (direction === "next") {
        if (currentIndex < shorts.length - 1) {
          console.log("⬇️ Moving to next short");
          setCurrentIndex(currentIndex + 1);
        } else if (hasMore && !loading) {
          console.log("📥 Fetching more shorts...");
          fetchShorts(page + 1);
        }
      } else {
        if (currentIndex > 0) {
          console.log("⬆️ Moving to previous short");
          setCurrentIndex(currentIndex - 1);
        }
      }

      // Reset navigation lock after animation completes
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 300); // Match animation duration
    },
    [currentIndex, shorts.length, hasMore, loading, page]
  );

  const handleNext = useCallback(() => {
    handleNavigation("next");
  }, [handleNavigation]);

  const handlePrevious = useCallback(() => {
    handleNavigation("prev");
  }, [handleNavigation]);

  // ✅ OPTIMIZED: Mouse wheel navigation with throttling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let wheelTimeout: NodeJS.Timeout | null = null;
    let wheelDelta = 0;
    const WHEEL_THRESHOLD = 100;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      wheelDelta += e.deltaY;

      if (wheelTimeout) {
        clearTimeout(wheelTimeout);
      }

      wheelTimeout = setTimeout(() => {
        if (Math.abs(wheelDelta) > WHEEL_THRESHOLD) {
          if (wheelDelta > 0) {
            handleNext();
          } else {
            handlePrevious();
          }
        }
        wheelDelta = 0;
      }, 150);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (wheelTimeout) clearTimeout(wheelTimeout);
    };
  }, [handleNext, handlePrevious]);

  // ✅ OPTIMIZED: Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (
        e.key === "ArrowDown" ||
        e.key === "PageDown" ||
        e.key === "s" ||
        e.key === "S"
      ) {
        e.preventDefault();
        handleNext();
      } else if (
        e.key === "ArrowUp" ||
        e.key === "PageUp" ||
        e.key === "w" ||
        e.key === "W"
      ) {
        e.preventDefault();
        handlePrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrevious]);

  // ✅ Refresh functionality
  const handleRefresh = () => {
    setIsRefreshing(true);
    setShorts([]);
    setCurrentIndex(0);
    setPage(1);
    setHasMore(true);
    viewedShorts.current.clear();
    fetchShorts(1);
  };

  // ========== LOADING STATE ==========
  if (loading && shorts.length === 0) {
    return (
      <>
        <Head>
          <title>Shorts - YouTube</title>
        </Head>
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent" />
            <p className="text-white text-xl font-semibold">Loading Shorts...</p>
            <p className="text-gray-400 text-sm">Please wait</p>
          </div>
        </div>
      </>
    );
  }

  // ========== ERROR STATE ==========
  if (error && shorts.length === 0) {
    return (
      <>
        <Head>
          <title>Shorts - YouTube</title>
        </Head>
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 p-4 z-50">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-white text-2xl font-bold mb-2">{error}</h2>
            <p className="text-gray-400 mb-6">
              Unable to load shorts right now
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg transition transform hover:scale-105 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Refreshing..." : "Try Again"}
            </button>
            <button
              onClick={() => router.push("/")}
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg transition transform hover:scale-105 font-semibold"
            >
              Go Home
            </button>
          </div>
        </div>
      </>
    );
  }

  // ========== NO SHORTS STATE ==========
  if (!loading && shorts.length === 0) {
    return (
      <>
        <Head>
          <title>Shorts - YouTube</title>
        </Head>
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 p-4 z-50">
          <div className="text-center">
            <div className="text-6xl mb-4">📹</div>
            <h2 className="text-white text-2xl font-bold mb-2">No Shorts Yet</h2>
            <p className="text-gray-400 mb-6">Check back later for new content!</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-white transition mt-4 underline"
          >
            Go to Home
          </button>
        </div>
      </>
    );
  }

  // ========== MAIN SHORTS PLAYER ==========
  return (
    <>
      <Head>
        <title>Shorts - YouTube</title>
      </Head>

      <div
        ref={containerRef}
        className="fixed inset-0 bg-black overflow-hidden"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          touchAction: "pan-y",
        }}
      >
        {/* Back Button - Desktop Only */}
        <button
          onClick={() => router.push("/")}
          className="hidden md:flex fixed top-6 left-6 z-[100] items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition"
        >
          <ChevronLeft size={20} />
          <span className="font-semibold">Back</span>
        </button>

        {/* Progress indicator - Desktop */}
        <div className="hidden md:block fixed top-6 right-6 z-[100] bg-black/70 backdrop-blur-md rounded-full px-5 py-2 text-white text-sm font-semibold border border-white/20">
          {currentIndex + 1} / {shorts.length}
          {loading && " • Loading..."}
        </div>

        {/* Progress indicator - Mobile */}
        <div className="md:hidden fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] bg-black/70 backdrop-blur-md rounded-full px-5 py-2 text-white text-sm font-semibold border border-white/20">
          {currentIndex + 1} / {shorts.length}
        </div>

        {/* Navigation hints - Desktop only */}
        <div className="fixed top-20 left-6 z-[90] bg-black/70 backdrop-blur-md rounded-lg px-4 py-2 text-white text-xs border border-white/20 hidden lg:block">
          <div className="flex flex-col gap-1">
            <div>🖱️ Scroll: Navigate</div>
            <div>⌨️ ↑↓ / W/S: Navigate</div>
            <div>🖱️ Click: Play/Pause</div>
          </div>
        </div>

        {/* Shorts Container with Virtual Rendering */}
        <div className="relative w-full h-full">
          {shorts.map((short, index) => {
            // Only render current, previous, and next short for performance
            const shouldRender = Math.abs(index - currentIndex) <= 1;

            if (!shouldRender) return null;

            const isActive = index === currentIndex;
            const position = index - currentIndex;

            return (
              <div
                key={short._id}
                className="absolute inset-0 transition-transform duration-300 ease-out"
                style={{
                  transform: `translateY(${position * 100}%)`,
                  zIndex: isActive ? 20 : 10,
                  pointerEvents: isActive ? "auto" : "none",
                }}
              >
                <ShortPlayer
                  short={short}
                  isActive={isActive}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  onDelete={handleShortDeleted}
                />
              </div>
            );
          })}
        </div>

        {/* Navigation arrows - Desktop only */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrevious}
            className="fixed top-1/2 right-6 transform -translate-y-1/2 z-[80] bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full p-3 text-white transition-all hidden lg:block"
            style={{ marginTop: "-60px" }}
            aria-label="Previous short"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
        )}

        {currentIndex < shorts.length - 1 && (
          <button
            onClick={handleNext}
            className="fixed top-1/2 right-6 transform -translate-y-1/2 z-[80] bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full p-3 text-white transition-all hidden lg:block"
            style={{ marginTop: "60px" }}
            aria-label="Next short"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}

        {/* Loading indicator */}
        {loading && shorts.length > 0 && (
          <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 z-[80] lg:bottom-8">
            <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 text-white text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Loading more shorts...
            </div>
          </div>
        )}

        {/* End indicator */}
        {!hasMore && shorts.length > 0 && currentIndex === shorts.length - 1 && (
          <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 z-[80] lg:bottom-8">
            <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 text-white text-sm">
              You've reached the end! 🎉
            </div>
          </div>
        )}

        {/* Mobile Navigation Hints - Show on first load */}
        {currentIndex === 0 && shorts.length > 1 && (
          <div className="md:hidden fixed bottom-32 left-0 right-0 z-[40] pointer-events-none animate-bounce">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-black/70 backdrop-blur-md rounded-full text-white text-sm font-semibold">
                <span>Swipe up for next</span>
                <span className="text-2xl">↑</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </>
  );
};

export default ShortsPage;  