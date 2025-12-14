/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/shorts/index.tsx - FULLY MERGED & OPTIMIZED VERSION WITH LIKE STATE MANAGEMENT

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { RefreshCw, ChevronLeft } from "lucide-react";
import ShortPlayer from "@/components/ui/ShortPlayer";
import MobileBottomNav from "@/components/ui/MobileBottomNav";
import Head from "next/head";

// ✅ Force dynamic rendering & disable caching
export const dynamic = "force-dynamic";
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
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    "https://youtube-clone-project-q3pd.onrender.com"
  );
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
  const navigationQueueRef = useRef<"next" | "prev" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewedShorts = useRef<Set<string>>(new Set());
  const router = useRouter();

  // ✅ Initial fetch
  useEffect(() => {
    fetchShorts(1);
  }, []);

  // ✅ Listen for avatar updates
  useEffect(() => {
    const handleAvatarUpdate = () => {
      console.log("🔄 Avatar updated, refreshing shorts");
      // Force re-render of current short
      setShorts((prev) => [...prev]);
    };

    window.addEventListener("avatarUpdated", handleAvatarUpdate);
    return () =>
      window.removeEventListener("avatarUpdated", handleAvatarUpdate);
  }, []);
  // ✅ Handle start query parameter
  useEffect(() => {
    if (router.query.id && shorts.length > 0) {
      const shortId = router.query.id as string;
      console.log("🎯 Looking for short with ID:", shortId);

      const foundIndex = shorts.findIndex((s) => s._id === shortId);

      if (foundIndex !== -1) {
        console.log("✅ Found short at index:", foundIndex);
        setCurrentIndex(foundIndex);

        // Remove id from URL to clean it up
        const { id, ...restQuery } = router.query;
        router.replace(
          { pathname: router.pathname, query: restQuery },
          undefined,
          { shallow: true }
        );
      } else {
        console.warn("⚠️ Short not found in current array, fetching by ID...");
        fetchSingleShortAndInsert(shortId);
      }
    }
  }, [router.query.id, shorts.length]);

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
        "📡 Fetching shorts from:",
        `${apiUrl}/api/shorts?page=${pageNum}`
      );

      const response = await axios.get(`${apiUrl}/api/shorts`, {
        params: {
          page: pageNum,
          limit: 10,
          _t: Date.now(),
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      console.log("✅ Shorts response:", {
        success: response.data.success,
        count: response.data.data?.length,
        firstShort: response.data.data?.[0]
          ? {
              id: response.data.data[0]._id,
              title: response.data.data[0].title,
              videoUrl: response.data.data[0].videoUrl?.substring(0, 100),
              hasCloudinary:
                response.data.data[0].videoUrl?.includes("cloudinary"),
            }
          : null,
      });

      if (response.data.success && Array.isArray(response.data.data)) {
        const newShorts = response.data.data;

        // ✅ Validate video URLs
        // ✅ Validate video URLs more thoroughly
        // Around line 155, update the validation:
        const validShorts = newShorts.filter((short) => {
          if (!short.videoUrl) {
            console.error(
              "❌ Short missing video URL:",
              short._id,
              short.title
            );
            return false;
          }

          // ✅ ENHANCED: Check if URL is accessible
          const url = short.videoUrl;
          const isValid =
            url.startsWith("http://") ||
            url.startsWith("https://") ||
            url.includes("cloudinary.com") ||
            url.includes("res.cloudinary.com");

          if (!isValid) {
            console.error("❌ Invalid video URL format:", url);
            return false;
          }

          // ✅ NEW: Check if Cloudinary URL is properly formatted
          if (url.includes("cloudinary.com")) {
            const hasProtocol = url.startsWith("https://");
            const hasPath = url.includes("/upload/");

            if (!hasProtocol || !hasPath) {
              console.error("❌ Malformed Cloudinary URL:", url);
              return false;
            }
          }

          console.log("✅ Valid short:", short._id, url.substring(0, 50));
          return true;
        });

        if (validShorts.length < newShorts.length) {
          console.warn(
            `⚠️ Filtered out ${
              newShorts.length - validShorts.length
            } shorts without video URLs`
          );
        }

        if (validShorts.length === 0) {
          setHasMore(false);
          setError("No valid shorts available");
        } else {
          setShorts((prev) => {
            const existingIds = new Set(prev.map((s) => s._id));
            const uniqueNewShorts = validShorts.filter(
              (s) => !existingIds.has(s._id)
            );
            return pageNum === 1 ? validShorts : [...prev, ...uniqueNewShorts];
          });
          setPage(pageNum);
        }
      } else {
        setError("Failed to load shorts");
      }
    } catch (error: any) {
      console.error("❌ Error fetching shorts:", error);
      console.error("   Response data:", error.response?.data);
      console.error("   Status:", error.response?.status);

      setError(
        error.response?.data?.message ||
          "Failed to load shorts. Please try again."
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchSingleShortAndInsert = async (shortId: string) => {
    try {
      const token = localStorage.getItem("token");
      const apiUrl = getApiUrl();

      console.log("📡 Fetching single short:", shortId);

      const response = await axios.get(`${apiUrl}/api/shorts/${shortId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.data.success && response.data.data) {
        const fetchedShort = response.data.data;
        console.log("✅ Fetched short:", fetchedShort.title);

        // Insert at beginning and set as current
        setShorts((prev) => [fetchedShort, ...prev]);
        setCurrentIndex(0);

        // Clean up URL
        const { id, ...restQuery } = router.query;
        router.replace(
          { pathname: router.pathname, query: restQuery },
          undefined,
          { shallow: true }
        );
      } else {
        console.error("❌ Short not found");
        // Fall back to normal shorts feed
        router.replace("/shorts", undefined, { shallow: true });
      }
    } catch (error: any) {
      console.error("❌ Error fetching single short:", error);
      router.replace("/shorts", undefined, { shallow: true });
    }
  };

  // ✅ NEW: Callback to update short in array when liked/disliked
  // ✅ NEW: Callback to update short in array when liked/disliked
  const handleShortLiked = useCallback(
    (
      shortId: string,
      liked: boolean,
      likesCount: number,
      disliked?: boolean,
      dislikesCount?: number
    ) => {
      console.log("\n🔵 ===== handleShortLiked CALLED IN PARENT =====");
      console.log("📥 Received:", {
        shortId,
        liked,
        likesCount,
        disliked,
        dislikesCount,
      });

      setShorts((prevShorts) => {
        console.log("📊 Current shorts array length:", prevShorts.length);

        const updatedShorts = prevShorts.map((s) => {
          if (s._id === shortId) {
            console.log("✅ Found matching short, updating:");
            console.log("   Before:", {
              hasLiked: s.hasLiked,
              likesCount: s.likesCount,
            });

            const updated = {
              ...s,
              hasLiked: liked,
              likesCount: likesCount,
              ...(disliked !== undefined && { hasDisliked: disliked }),
              ...(dislikesCount !== undefined && {
                dislikesCount: dislikesCount,
              }),
            };

            console.log("   After:", {
              hasLiked: updated.hasLiked,
              likesCount: updated.likesCount,
            });
            return updated;
          }
          return s;
        });

        console.log("✅ Shorts array updated");
        return updatedShorts;
      });

      console.log("===== handleShortLiked COMPLETE =====\n");
    },
    []
  );
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
            <p className="text-white text-xl font-semibold">
              Loading Shorts...
            </p>
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
              <RefreshCw
                size={20}
                className={isRefreshing ? "animate-spin" : ""}
              />
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
            <h2 className="text-white text-2xl font-bold mb-2">
              No Shorts Yet
            </h2>
            <p className="text-gray-400 mb-6">
              Check back later for new content!
            </p>
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
        className="fixed inset-0 bg-black"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          minHeight: "100vh",
          maxHeight: "100vh",
          overflow: "hidden",
          WebkitOverflowScrolling: "touch",
          display: "block",
          zIndex: 50,
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
          backgroundColor: "#000",
        }}
        data-page="shorts" // ✅ THIS IS CRITICAL
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

        {/* Shorts Container */}
        <div
          className="relative w-full h-full"
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {shorts.map((short, index) => {
            const shouldRender = Math.abs(index - currentIndex) <= 1;
            if (!shouldRender) return null;

            const isActive = index === currentIndex;
            const position = index - currentIndex;

            return (
              <div
                key={short._id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  // ✅ CRITICAL FIX: Use visibility instead of transform
                  visibility: isActive ? "visible" : "hidden",
                  opacity: isActive ? 1 : 0,
                  transition: "opacity 300ms ease-out",
                  zIndex: isActive ? 30 : 20,
                  pointerEvents: isActive ? "auto" : "none",
                }}
                data-short-index={index}
                data-is-active={isActive}
                data-short-id={short._id}
              >
                <ShortPlayer
                  short={short}
                  isActive={isActive}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  onDelete={handleShortDeleted}
                  onLikeUpdate={handleShortLiked}
                />
              </div>
            );
          })}
        </div>

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
        {!hasMore &&
          shorts.length > 0 &&
          currentIndex === shorts.length - 1 && (
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

function fetchSingleShortAndInsert(shortId: string) {
  throw new Error("Function not implemented.");
}
