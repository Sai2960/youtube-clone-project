"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  MoreVertical, 
  X, 
  Clock, 
  Trash2, 
  Play,
  Search
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

// Types remain the same...
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
  contentType?: 'video' | 'short';
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
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
};

const groupHistoryByDate = (history: HistoryItem[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const groups: Record<string, HistoryItem[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    'This Month': [],
    Older: []
  };
  
  history.forEach(item => {
    const itemDate = new Date(item.createdAt);
    itemDate.setHours(0, 0, 0, 0);
    
    if (itemDate.getTime() === today.getTime()) {
      groups.Today.push(item);
    } else if (itemDate.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(item);
    } else if (itemDate > new Date(today.getTime() - 7 * 86400000)) {
      groups['This Week'].push(item);
    } else if (itemDate > new Date(today.getTime() - 30 * 86400000)) {
      groups['This Month'].push(item);
    } else {
      groups.Older.push(item);
    }
  });
  
  return Object.entries(groups).filter(([_, items]) => items.length > 0);
};

export default function HistoryContent() {
  const [activeTab, setActiveTab] = useState<string>('All');
  const [allHistory, setAllHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useUser();

  const tabs = ['All', 'Videos', 'Shorts'];

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
          ...(response.data.shorts || [])
        ];
        
        const uniqueMap = new Map<string, HistoryItem>();
        combined.forEach((item: HistoryItem) => {
          uniqueMap.set(item._id, item);
        });
        
        const uniqueHistory = Array.from(uniqueMap.values());
        const sorted = uniqueHistory.sort((a, b) => 
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

  const filterHistory = () => {
    let filtered: HistoryItem[] = [...allHistory];
    
    if (activeTab === 'Videos') {
      filtered = filtered.filter(item => {
        const hasVideo = item.videoid !== null && 
                        item.videoid !== undefined && 
                        typeof item.videoid === 'object';
        const isVideo = !item.contentType || item.contentType === 'video';
        return hasVideo && isVideo;
      });
    } else if (activeTab === 'Shorts') {
      filtered = filtered.filter(item => {
        const hasShort = item.shortid !== null && 
                        item.shortid !== undefined && 
                        typeof item.shortid === 'object';
        const isShort = !item.contentType || item.contentType === 'short';
        return hasShort && isShort;
      });
    }
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => {
        const video = item.videoid;
        const short = item.shortid;
        const searchLower = searchQuery.toLowerCase();
        
        if (video && typeof video === 'object') {
          return video.videotitle?.toLowerCase().includes(searchLower) ||
                 video.videochanel?.toLowerCase().includes(searchLower);
        }
        if (short && typeof short === 'object') {
          return short.title?.toLowerCase().includes(searchLower) ||
                 short.channelName?.toLowerCase().includes(searchLower);
        }
        return false;
      });
    }
    
    setFilteredHistory(filtered);
  };

  const handleRemoveFromHistory = async (historyId: string) => {
    try {
      await axiosInstance.delete(`/history/item/${historyId}`, {
        data: { userId: user?._id }
      });
      setAllHistory(allHistory.filter((item) => item._id !== historyId));
    } catch (error) {
      console.error("❌ Error removing from history:", error);
    }
  };

  const handleClearHistory = async () => {
    let message = "";
    let itemsToDelete: HistoryItem[] = [];
    
    if (activeTab === 'Videos') {
      itemsToDelete = allHistory.filter(item => 
        item.videoid && typeof item.videoid === 'object' && 
        (!item.contentType || item.contentType === 'video')
      );
      message = "Clear all watched videos?";
    } else if (activeTab === 'Shorts') {
      itemsToDelete = allHistory.filter(item => 
        item.shortid && typeof item.shortid === 'object' && 
        (!item.contentType || item.contentType === 'short')
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
          data: { userId: user?._id }
        });
      }
      setAllHistory(allHistory.filter(item => !itemsToDelete.find(del => del._id === item._id)));
    } catch (error) {
      console.error("❌ Error clearing history:", error);
      alert("Failed to clear history");
    }
  };

  const getVideoUrl = (video: Video) => {
  if (video?.videofilename) {
    return `${"https://youtube-clone-project-q3pd.onrender.com"

/uploads/videos/${video.videofilename}`;
  } else if (video?.filepath) {
    const filename = video.filepath.split(/[\\/]/).pop();
    return `${"https://youtube-clone-project-q3pd.onrender.com"

/uploads/videos/${filename}`;
  }
  return "";
};

 const getShortThumbnail = (short: Short) => {
  if (short?.thumbnailUrl) {
    const backendUrl = "https://youtube-clone-project-q3pd.onrender.com"

}';
    if (short.thumbnailUrl.startsWith('http')) {
      return short.thumbnailUrl;
    }
    return `${backendUrl}${short.thumbnailUrl}`;
  }
  return null;
};

  const getShortUrl = (short: Short) => {
    if (short?.videoUrl) {
      const backendUrl = "https://youtube-clone-project-q3pd.onrender.com"

}';
      if (short.videoUrl.startsWith('http')) {
        return short.videoUrl;
      }
      return `${backendUrl}${short.videoUrl}`;
    }
    return '';
  };

  const groupedHistory = groupHistoryByDate(filteredHistory);
  const shortsInHistory = filteredHistory.filter(item => 
    item.shortid && typeof item.shortid === 'object' && 
    (!item.contentType || item.contentType === 'short')
  );
  const videosInHistory = filteredHistory.filter(item => 
    item.videoid && typeof item.videoid === 'object' && 
    (!item.contentType || item.contentType === 'video')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700 border-t-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading history...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md px-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
            Keep track of what you watch
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Watch history isn&apos;t viewable when signed out.
          </p>
          <Link href="/login">
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
     <div className="w-full min-h-screen bg-white dark:bg-[#0f0f0f] overflow-x-hidden">

      {/* ✅ Mobile Header - Compact */}
      <div className="md:hidden px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Watch history
        </h1>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {filteredHistory.length} {filteredHistory.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* ✅ Desktop Header - Spacious */}
      <div className="hidden md:block max-w-7xl mx-auto px-6 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Watch history
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {filteredHistory.length} {filteredHistory.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 md:pb-6 w-full overflow-x-hidden">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 md:mb-4 py-2">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all flex-shrink-0 ${
                activeTab === tab
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                  : 'bg-gray-100 dark:bg-[#272727] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3f3f3f]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Clear Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          className="mb-3 text-red-600 dark:text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear {activeTab === 'All' ? 'All' : activeTab}
        </Button>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <Input
            type="text"
            placeholder="Search watch history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 dark:bg-[#121212] border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-full"
          />
        </div>

        {/* Content */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-24 h-24 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              {searchQuery ? 'No results found' : 'No watch history yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'Try different keywords' : 'Videos you watch will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
           {/* Shorts Section - MOBILE FIXED */}
{(activeTab === 'All' || activeTab === 'Shorts') && shortsInHistory.length > 0 && (
  <div className="pb-6 border-b border-gray-200 dark:border-gray-800 overflow-hidden">
    <div className="flex items-center gap-2 mb-4 px-4 md:px-0">
      <Play className="text-red-600 w-5 h-5" fill="currentColor" />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Shorts</h2>
    </div>
    
    {/* ✅ MOBILE-OPTIMIZED SCROLL CONTAINER */}
    <div className="w-full shorts-scroll-container">
      <div className="flex gap-3 pb-2 px-4 md:px-0 min-w-min overflow-x-auto scrollbar-hide">
        {shortsInHistory.slice(0, 10).map(item => {
          const short = item.shortid;
          if (!short || typeof short !== 'object') return null;

          const thumbnailUrl = getShortThumbnail(short);
          const videoUrl = getShortUrl(short);

          return (
            <Link key={item._id} href={`/shorts/${short._id}`}>
              <div className="flex-shrink-0 group cursor-pointer w-[160px] md:w-[180px]">
                <div className="aspect-[9/16] bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden relative">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={short.title || "Short"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : videoUrl ? (
                    <video
                      src={videoUrl}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                      <Play className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
                
                <div className="mt-2 px-1">
                  <h3 className="text-sm font-medium line-clamp-2 leading-tight text-gray-900 dark:text-white mb-1">
                    {short.title || "Untitled Short"}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {short.views?.toLocaleString() || '0'} views
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  </div>
)}

            {/* Videos History */}
            {videosInHistory.length > 0 && (
              <div>
                {groupedHistory.map(([dateGroup, items]) => {
                  const videoItems = items.filter(item => 
                    item.videoid && typeof item.videoid === 'object' && 
                    (!item.contentType || item.contentType === 'video')
                  );
                  if (videoItems.length === 0) return null;

                  return (
                    <div key={dateGroup} className="mb-6">
                      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white sticky top-0 bg-white dark:bg-[#0f0f0f] py-2 z-10">
                        {dateGroup}
                      </h2>
                      
                      <div className="space-y-3">
                        {videoItems.map((item) => {
                          const video = item.videoid;
                          if (!video || typeof video !== 'object') return null;

                          return (
                           <div key={item._id} className="mb-2 md:mb-3">
                              {/* Video Card - Optimized for Mobile & Desktop */}
                              <div className="flex gap-2 md:gap-3 hover:bg-gray-50 dark:hover:bg-[#272727] p-2 rounded-lg transition-colors relative group">
                                {/* Thumbnail - Left Side */}
                                <Link href={`/watch/${video._id}`} className="flex-shrink-0">
                                  <div className="w-[140px] h-[78px] md:w-[246px] md:h-[138px] bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden relative">
                                    <video
                                      src={getVideoUrl(video)}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                      <Play className="w-8 h-8 md:w-10 md:h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="white" />
                                    </div>
                                  </div>
                                </Link>

                                {/* Video Info - Right Side */}
                                <div className="flex-1 min-w-0 flex flex-col py-0.5 md:py-1">
                                  <Link href={`/watch/${video._id}`} className="flex-1">
                                    <div className="space-y-0.5 md:space-y-1">
                                      {/* Title */}
                                      <h3 className="font-medium text-sm md:text-base line-clamp-2 text-gray-900 dark:text-white leading-tight pr-6 md:pr-8">
                                        {video.videotitle}
                                      </h3>
                                      
                                      {/* Channel */}
                                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                                        {video.videochanel}
                                      </p>
                                      
                                      {/* Views & Upload Time */}
                                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                        <span>{video.views?.toLocaleString() || '0'} views</span>
                                        <span>•</span>
                                        <span className="hidden sm:inline">{formatTimeAgo(video.createdAt)}</span>
                                        <span className="sm:hidden">{formatTimeAgo(video.createdAt).split(' ')[0]} {formatTimeAgo(video.createdAt).split(' ')[1]}</span>
                                      </div>
                                      
                                      {/* Watch Time - Mobile */}
                                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        <span className="hidden sm:inline">Watched {formatTimeAgo(item.createdAt)}</span>
                                        <span className="sm:hidden">Watched {formatTimeAgo(item.createdAt).split(' ')[0]} {formatTimeAgo(item.createdAt).split(' ')[1]}</span>
                                      </div>
                                    </div>
                                  </Link>
                                </div>

                                {/* Menu Button - Top Right */}
                                <div className="absolute top-1 right-1 md:top-2 md:right-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => e.preventDefault()}
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent 
                                      align="end" 
                                      className="w-56 bg-white dark:bg-[#282828] border-gray-200 dark:border-gray-700"
                                    >
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleRemoveFromHistory(item._id);
                                        }}
                                        className="text-red-600 dark:text-red-500 focus:text-red-700 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer"
                                      >
                                        <X className="w-4 h-4 mr-2" />
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