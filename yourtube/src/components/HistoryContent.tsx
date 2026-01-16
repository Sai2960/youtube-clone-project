/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MoreVertical,
  X,
  Clock,
  Trash2,
  Play,
  Search,
  History,
  Film,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

// Types
interface Video {
  _id: string;
  videotitle: string;
  videochanel: string;
  channelid: string;
  views: number;
  videofilename?: string;
  filepath?: string;
  createdAt: string;
  uploadedBy?: {
    _id: string;
    name: string;
    channelname: string;
    image: string;
  };
}

interface Short {
  _id: string;
  title: string;
  description?: string;
  views: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  createdAt: string;
  channelName?: string;
  channelAvatar?: string;
  userId?: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

interface HistoryItem {
  _id: string;
  createdAt: string;
  videoid?: Video | null;
  shortid?: Short | null;
  contentType?: "video" | "short";
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
    }
  }
  return "just now";
};

const groupHistoryByDate = (history: HistoryItem[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, HistoryItem[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    "This Month": [],
    Older: [],
  };

  history.forEach((item) => {
    const itemDate = new Date(item.createdAt);
    itemDate.setHours(0, 0, 0, 0);

    if (itemDate.getTime() === today.getTime()) {
      groups.Today.push(item);
    } else if (itemDate.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(item);
    } else if (itemDate > new Date(today.getTime() - 7 * 86400000)) {
      groups["This Week"].push(item);
    } else if (itemDate > new Date(today.getTime() - 30 * 86400000)) {
      groups["This Month"].push(item);
    } else {
      groups.Older.push(item);
    }
  });

  return Object.entries(groups).filter(([_, items]) => items.length > 0);
};

export default function HistoryContent() {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [allHistory, setAllHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useUser();
  const [failedThumbnails, setFailedThumbnails] = useState<Set<string>>(
    new Set()
  );
  const [failedVideos, setFailedVideos] = useState<Set<string>>(new Set());

  const tabs = [
    { id: "All", icon: History, label: "All" },
    { id: "Videos", icon: Film, label: "Videos" },
    { id: "Shorts", icon: Zap, label: "Shorts" },
  ];

  // ============================================================================
  // LOAD HISTORY
  // ============================================================================
  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    filterHistory();
  }, [searchQuery, allHistory, activeTab]);

  const loadHistory = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(`/history/${user._id}`);

      if (response.data.success) {
        const combined = response.data.combined || [
          ...(response.data.videos || []),
          ...(response.data.shorts || []),
        ];

        const uniqueMap = new Map<string, HistoryItem>();
        combined.forEach((item: HistoryItem) => {
          uniqueMap.set(item._id, item);
        });

        const uniqueHistory = Array.from(uniqueMap.values());
        const sorted = uniqueHistory.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setAllHistory(sorted);
      }
    } catch (error: any) {
      console.error("❌ Error loading history:", error.message);
      setError(error.response?.data?.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FILTER HISTORY
  // ============================================================================
  const filterHistory = () => {
    let filtered: HistoryItem[] = [...allHistory];

    if (activeTab === "Videos") {
      filtered = filtered.filter((item) => {
        const hasVideo =
          item.videoid !== null &&
          item.videoid !== undefined &&
          typeof item.videoid === "object";
        const isVideo = !item.contentType || item.contentType === "video";
        return hasVideo && isVideo;
      });
    } else if (activeTab === "Shorts") {
      filtered = filtered.filter((item) => {
        const hasShort =
          item.shortid !== null &&
          item.shortid !== undefined &&
          typeof item.shortid === "object";
        const isShort = !item.contentType || item.contentType === "short";
        return hasShort && isShort;
      });
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter((item) => {
        const video = item.videoid;
        const short = item.shortid;
        const searchLower = searchQuery.toLowerCase();

        if (video && typeof video === "object") {
          return (
            video.videotitle?.toLowerCase().includes(searchLower) ||
            video.videochanel?.toLowerCase().includes(searchLower)
          );
        }
        if (short && typeof short === "object") {
          return (
            short.title?.toLowerCase().includes(searchLower) ||
            short.channelName?.toLowerCase().includes(searchLower)
          );
        }
        return false;
      });
    }

    setFilteredHistory(filtered);
  };

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================
  const handleRemoveFromHistory = async (historyId: string) => {
    try {
      await axiosInstance.delete(`/history/item/${historyId}`, {
        data: { userId: user?._id },
      });
      setAllHistory(allHistory.filter((item) => item._id !== historyId));
    } catch (error) {
      console.error("❌ Error removing from history:", error);
    }
  };

  const handleClearHistory = async () => {
    let message = "";
    let itemsToDelete: HistoryItem[] = [];

    if (activeTab === "Videos") {
      itemsToDelete = allHistory.filter(
        (item) =>
          item.videoid &&
          typeof item.videoid === "object" &&
          (!item.contentType || item.contentType === "video")
      );
      message = "Clear all watched videos?";
    } else if (activeTab === "Shorts") {
      itemsToDelete = allHistory.filter(
        (item) =>
          item.shortid &&
          typeof item.shortid === "object" &&
          (!item.contentType || item.contentType === "short")
      );
      message = "Clear all watched shorts?";
    } else {
      itemsToDelete = allHistory;
      message = "Clear all watch history?";
    }

    if (itemsToDelete.length === 0) {
      alert("Nothing to clear!");
      return;
    }

    if (!window.confirm(message)) return;

    try {
      for (const item of itemsToDelete) {
        await axiosInstance.delete(`/history/item/${item._id}`, {
          data: { userId: user?._id },
        });
      }
      setAllHistory(
        allHistory.filter(
          (item) => !itemsToDelete.find((del) => del._id === item._id)
        )
      );
    } catch (error) {
      console.error("❌ Error clearing history:", error);
      alert("Failed to clear history");
    }
  };

  // ============================================================================
  // URL HELPERS
  // ============================================================================
  const getShortThumbnail = (short: Short) => {
    if (!short?.thumbnailUrl) {
      return null;
    }

    const backendUrl =
      "https://youtube-clone-project-production.up.railway.app";

    if (short.thumbnailUrl.startsWith("http")) {
      return short.thumbnailUrl;
    }

    const path = short.thumbnailUrl.startsWith("/")
      ? short.thumbnailUrl
      : `/${short.thumbnailUrl}`;

    return `${backendUrl}${path}`;
  };

  const getShortUrl = (short: Short) => {
    if (!short?.videoUrl) {
      return "";
    }

    const backendUrl =
      "https://youtube-clone-project-production.up.railway.app";

    if (short.videoUrl.startsWith("http")) {
      return short.videoUrl;
    }

    const path = short.videoUrl.startsWith("/")
      ? short.videoUrl
      : `/${short.videoUrl}`;

    return `${backendUrl}${path}`;
  };

  const getVideoUrl = (vid: Video) => {
    const backendUrl =
      "https://youtube-clone-project-production.up.railway.app";

    if (vid.filepath) {
      if (vid.filepath.startsWith("http")) {
        return vid.filepath;
      }
      return `${backendUrl}${vid.filepath}`;
    }

    if (vid.videofilename) {
      return `${backendUrl}/uploads/videos/${vid.videofilename}`;
    }

    return "";
  };

  // ============================================================================
  // FILTERED DATA
  // ============================================================================
  const groupedHistory = groupHistoryByDate(filteredHistory);
  const shortsInHistory = filteredHistory.filter(
    (item) =>
      item.shortid &&
      typeof item.shortid === "object" &&
      (!item.contentType || item.contentType === "short")
  );
  const videosInHistory = filteredHistory.filter(
    (item) =>
      item.videoid &&
      typeof item.videoid === "object" &&
      (!item.contentType || item.contentType === "video")
  );

  // ============================================================================
  // LOADING CHECK
  // ============================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-b from-white via-gray-50/50 to-white dark:from-[#0a0a0a] dark:via-[#111111] dark:to-[#0a0a0a]">
        <div className="text-center">
          {/* Premium animated loader */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-gray-200/30 dark:border-gray-700/30"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 animate-spin"></div>
            <div
              className="absolute inset-2 rounded-full border-2 border-transparent border-t-red-400/60 animate-spin"
              style={{
                animationDuration: "1.5s",
                animationDirection: "reverse",
              }}
            ></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-red-500/10 to-transparent"></div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 font-medium tracking-wide">
            Loading your history
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-light tracking-wider uppercase">
            {allHistory.length > 0
              ? `${allHistory.length} items found`
              : "Please wait..."}
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // NOT LOGGED IN
  // ============================================================================
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-b from-white via-gray-50/30 to-white dark:from-[#0a0a0a] dark:via-[#0f0f0f] dark:to-[#0a0a0a]">
        <div className="text-center max-w-md px-4">
          {/* Premium glass card */}
          <div className="relative p-8 rounded-3xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 shadow-2xl shadow-gray-200/50 dark:shadow-black/50">
            {/* Decorative gradient orb */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-red-500/20 to-orange-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl"></div>

            <div className="relative">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Clock className="w-10 h-10 text-gray-500 dark:text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white tracking-tight">
                Track Your Journey
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 font-light leading-relaxed">
                Sign in to access your personalized watch history and never lose
                track of your favorite content.
              </p>
              <Link href="/login">
                <Button className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 hover:scale-105">
                  Sign In to Continue
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#0f0f0f] dark:to-[#0a0a0a] overflow-x-hidden">
      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-red-500/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-purple-500/5 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Mobile Header - Premium */}
      <div className="md:hidden relative px-5 pt-6 pb-4 border-b border-gray-200/50 dark:border-white/5 bg-white/80 dark:bg-black/40 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Watch History
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">
              {filteredHistory.length}{" "}
              {filteredHistory.length === 1 ? "item" : "items"} in your library
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Header - Premium */}
      <div className="hidden md:block relative max-w-7xl mx-auto px-8 pt-10 pb-6">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-xl shadow-red-500/30">
              <History className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                Watch History
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-light">
                {filteredHistory.length}{" "}
                {filteredHistory.length === 1 ? "item" : "items"} • Your
                personal viewing timeline
              </p>
            </div>
          </div>

          {/* Stats badges */}
          <div className="flex gap-3">
            <div className="px-4 py-2 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200/50 dark:border-white/10">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                Videos
              </span>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {videosInHistory.length}
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200/50 dark:border-white/10">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                Shorts
              </span>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {shortsInHistory.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-10 w-full overflow-x-hidden">
       {/* Ultra Premium Tabs - Glass Morphism Style */}
<div className="flex gap-3 overflow-x-auto scrollbar-hide mb-4 md:mb-6 py-3">
  {tabs.map((tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`group relative px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-semibold transition-all duration-300 flex-shrink-0 flex items-center gap-2.5 overflow-hidden ${
          isActive
            ? "bg-gradient-to-br from-red-600 via-red-500 to-red-600 text-white shadow-xl shadow-red-500/25"
            : "bg-white/80 dark:bg-white/10 backdrop-blur-md text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-white/15 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 shadow-sm hover:shadow-md"
        }`}
      >
        {/* Shine effect for active state */}
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
        )}
        
        <Icon 
          className={`relative z-10 w-4 h-4 transition-all duration-300 ${
            isActive 
              ? 'text-white' 
              : 'text-gray-500 dark:text-gray-400 group-hover:text-red-500 dark:group-hover:text-red-400'
          }`} 
        />
        <span className="relative z-10">{tab.label}</span>
        
        {/* Subtle glow for active */}
        {isActive && (
          <div className="absolute inset-0 rounded-2xl bg-red-400/20 blur-xl -z-10"></div>
        )}
      </button>
    );
  })}
</div>


        {/* Premium Clear Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          className="mb-4 group px-4 py-2 rounded-xl text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50/50 dark:bg-red-500/5 hover:bg-red-100/80 dark:hover:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 transition-all duration-300"
        >
          <Trash2 className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
          <span className="font-medium">
            Clear {activeTab === "All" ? "All History" : activeTab}
          </span>
        </Button>

        {/* Premium Search */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-500/20 via-purple-500/20 to-blue-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-red-500" />
            <Input
              type="text"
              placeholder="Search your watch history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 h-12 bg-white/80 dark:bg-white/5 backdrop-blur-sm border-gray-200/50 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all duration-300 shadow-sm hover:shadow-md"
            />
          </div>
        </div>

        {/* Empty State - Premium */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-24">
            <div className="relative inline-block">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/20 to-purple-500/20 blur-2xl"></div>
              <div className="relative p-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 shadow-inner">
                <Clock className="w-16 h-16 text-gray-400 dark:text-gray-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mt-8 mb-3 text-gray-900 dark:text-white tracking-tight">
              {searchQuery ? "No Results Found" : "Your History Awaits"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 font-light max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? "Try adjusting your search terms to find what you're looking for"
                : "Start watching videos and they'll appear here for easy access"}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Shorts Section - Premium */}
            {(activeTab === "All" || activeTab === "Shorts") &&
              shortsInHistory.length > 0 && (
                <div className="pb-8 border-b border-gray-200/50 dark:border-white/5 overflow-hidden">
                  <div className="flex items-center gap-3 mb-6 px-4 md:px-0">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/25">
                      <Zap className="text-white w-4 h-4" fill="currentColor" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                      Shorts
                    </h2>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-xs font-medium text-gray-600 dark:text-gray-400">
                      {shortsInHistory.length}
                    </span>
                  </div>

                  <div className="w-full shorts-scroll-container">
                    <div className="flex gap-4 pb-4 px-4 md:px-0 min-w-min overflow-x-auto scrollbar-hide">
                      {shortsInHistory.slice(0, 10).map((item) => {
                        const short = item.shortid;
                        if (!short || typeof short !== "object") return null;

                        const thumbnailUrl = getShortThumbnail(short);
                        const videoUrl = getShortUrl(short);
                        const shortId = short._id;

                        const thumbnailFailed = failedThumbnails.has(shortId);
                        const videoFailed = failedVideos.has(shortId);

                        return (
                          <Link key={item._id} href={`/shorts/${short._id}`}>
                            <div className="flex-shrink-0 group cursor-pointer w-[160px] md:w-[200px]">
                              {/* Premium Short Card */}
                              <div className="short-thumbnail-container aspect-[9/16] rounded-2xl overflow-hidden relative bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 shadow-xl shadow-gray-300/50 dark:shadow-black/50 ring-1 ring-gray-200/50 dark:ring-white/10 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-gray-400/50 dark:group-hover:shadow-black/70 group-hover:scale-[1.02] group-hover:ring-red-500/30">
                                {thumbnailUrl && !thumbnailFailed ? (
                                  <img
                                    src={thumbnailUrl}
                                    alt={short.title || "Short"}
                                    className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-110"
                                    loading="lazy"
                                    onError={(e) => {
                                      console.error(
                                        "❌ Thumbnail failed for:",
                                        shortId,
                                        thumbnailUrl
                                      );
                                      setFailedThumbnails((prev) =>
                                        new Set(prev).add(shortId)
                                      );
                                    }}
                                    onLoad={() =>
                                      console.log(
                                        "✅ Thumbnail loaded:",
                                        shortId
                                      )
                                    }
                                  />
                                ) : (thumbnailFailed || !thumbnailUrl) &&
                                  videoUrl &&
                                  !videoFailed ? (
                                  <video
                                    src={videoUrl}
                                    className="w-full h-full object-cover bg-transparent relative z-10 transition-transform duration-700 group-hover:scale-110"
                                    preload="metadata"
                                    muted
                                    playsInline
                                    onError={(e) => {
                                      console.error(
                                        "❌ Video failed for:",
                                        shortId,
                                        videoUrl
                                      );
                                      setFailedVideos((prev) =>
                                        new Set(prev).add(shortId)
                                      );
                                    }}
                                    onLoadedMetadata={() =>
                                      console.log("✅ Video loaded:", shortId)
                                    }
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 dark:from-gray-700 dark:via-gray-800 dark:to-gray-900">
                                    <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                                      <Play className="w-12 h-12 mx-auto mb-2 opacity-40" />
                                      <p className="text-xs font-medium tracking-wide">
                                        No preview
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Premium gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20 opacity-60 group-hover:opacity-80 transition-opacity duration-300 z-20" />

                                {/* Play icon with premium animation */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-30">
                                  <div className="w-16 h-16 rounded-full bg-white/95 dark:bg-white/90 backdrop-blur-md flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                    <Play
                                      className="w-8 h-8 text-gray-900 ml-1"
                                      fill="currentColor"
                                    />
                                  </div>
                                </div>

                                {/* Views badge */}
                                <div className="absolute bottom-3 left-3 right-3 z-30">
                                  <p className="text-xs text-white/90 font-medium drop-shadow-lg">
                                    {short.views?.toLocaleString() || "0"} views
                                  </p>
                                </div>
                              </div>

                              {/* Title */}
                              <div className="mt-3 px-1">
                                <h3 className="text-sm font-semibold line-clamp-2 leading-snug text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300">
                                  {short.title || "Untitled Short"}
                                </h3>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            {/* Videos History - Premium */}
            {videosInHistory.length > 0 && (
              <div>
                {groupedHistory.map(([dateGroup, items]) => {
                  const videoItems = items.filter(
                    (item) =>
                      item.videoid &&
                      typeof item.videoid === "object" &&
                      (!item.contentType || item.contentType === "video")
                  );
                  if (videoItems.length === 0) return null;

                  return (
                    <div key={dateGroup} className="mb-8">
                      {/* Premium Date Header */}
                      <div className="flex items-center gap-3 mb-5 sticky top-16 md:top-0 bg-gradient-to-r from-gray-50/95 via-white/95 to-gray-50/95 dark:from-[#0a0a0a]/95 dark:via-[#0f0f0f]/95 dark:to-[#0a0a0a]/95 backdrop-blur-xl py-3 z-10 -mx-4 px-4 md:mx-0 md:px-0">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent"></div>
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest px-4">
                          {dateGroup}
                        </h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent"></div>
                      </div>

                      <div className="space-y-4">
                        {videoItems.map((item) => {
                          const video = item.videoid;
                          if (!video || typeof video !== "object") return null;

                          return (
                            <div key={item._id} className="group">
                              {/* Premium Video Card */}
                              <div className="flex gap-3 md:gap-5 p-3 md:p-4 rounded-2xl bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm border border-gray-200/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/5 hover:border-gray-300/50 dark:hover:border-white/10 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/30 transition-all duration-300 relative">
                                <Link
                                  href={`/watch/${video._id}`}
                                  className="flex-shrink-0"
                                >
                                  {/* Premium Thumbnail */}
                                  <div className="video-thumbnail-container w-[140px] h-[78px] md:w-[280px] md:h-[158px] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 rounded-xl md:rounded-2xl overflow-hidden relative shadow-lg shadow-gray-300/50 dark:shadow-black/50 ring-1 ring-gray-200/50 dark:ring-white/10 transition-all duration-500 group-hover:shadow-xl group-hover:ring-red-500/20">
                                    <video
                                      src={getVideoUrl(video)}
                                      className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-105"
                                      preload="metadata"
                                      style={{ backgroundColor: "transparent" }}
                                    />
                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20" />
                                    {/* Play button */}
                                    <div className="absolute inset-0 flex items-center justify-center z-30">
                                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
                                        <Play
                                          className="w-6 h-6 md:w-8 md:h-8 text-gray-900 ml-0.5"
                                          fill="currentColor"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </Link>

                                <div className="flex-1 min-w-0 flex flex-col py-1 md:py-2 pr-8">
                                  <Link
                                    href={`/watch/${video._id}`}
                                    className="flex-1"
                                  >
                                    <div className="space-y-1.5 md:space-y-2">
                                      <h3 className="font-semibold text-sm md:text-lg line-clamp-2 text-gray-900 dark:text-white leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300">
                                        {video.videotitle}
                                      </h3>

                                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 font-medium">
                                        {video.videochanel}
                                      </p>

                                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                                        <span className="font-medium">
                                          {video.views?.toLocaleString() || "0"}{" "}
                                          views
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600"></span>
                                        <span className="hidden sm:inline">
                                          {formatTimeAgo(video.createdAt)}
                                        </span>
                                        <span className="sm:hidden">
                                          {
                                            formatTimeAgo(
                                              video.createdAt
                                            ).split(" ")[0]
                                          }{" "}
                                          {
                                            formatTimeAgo(
                                              video.createdAt
                                            ).split(" ")[1]
                                          }
                                        </span>
                                      </div>

                                      {/* Premium watched badge */}
                                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100/80 dark:bg-white/5 text-xs text-gray-500 dark:text-gray-400 w-fit">
                                        <Clock className="w-3 h-3" />
                                        <span className="hidden sm:inline font-medium">
                                          Watched{" "}
                                          {formatTimeAgo(item.createdAt)}
                                        </span>
                                        <span className="sm:hidden font-medium">
                                          {
                                            formatTimeAgo(item.createdAt).split(
                                              " "
                                            )[0]
                                          }{" "}
                                          {
                                            formatTimeAgo(item.createdAt).split(
                                              " "
                                            )[1]
                                          }
                                        </span>
                                      </div>
                                    </div>
                                  </Link>
                                </div>

                                {/* Premium dropdown */}
                                <div className="absolute top-3 right-3 md:top-4 md:right-4">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300"
                                        onClick={(e) => e.preventDefault()}
                                      >
                                        <MoreVertical className="w-5 h-5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-56 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl border-gray-200/50 dark:border-white/10 rounded-xl shadow-2xl shadow-gray-200/50 dark:shadow-black/50"
                                    >
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleRemoveFromHistory(item._id);
                                        }}
                                        className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-500/10 cursor-pointer rounded-lg mx-1 my-0.5"
                                      >
                                        <X className="w-4 h-4 mr-3" />
                                        Remove from history
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
