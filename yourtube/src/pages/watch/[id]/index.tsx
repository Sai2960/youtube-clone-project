import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import GestureVideoPlayer from "@/components/GestureVideoPlayer";
import ShareModal from "@/components/ui/ShareModal";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useState, useRef } from "react";
import { fixMediaURL } from "@/lib/urlHelper";
const WatchPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const commentsRef = useRef<HTMLDivElement>(null);

  // ✅ Track last fetched video ID to prevent duplicates
  const lastFetchedIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  // ✅ Optimized video fetch with duplicate prevention
  useEffect(() => {
    const fetchVideo = async () => {
      if (!id || typeof id !== "string") {
        console.log("⏭️ No valid ID, skipping fetch");
        setLoading(false);
        return;
      }

      // ✅ Prevent duplicate fetches for same video
      if (lastFetchedIdRef.current === id || isFetchingRef.current) {
        console.log("⏭️ Skipping duplicate fetch for:", id);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        isFetchingRef.current = true;
        lastFetchedIdRef.current = id;

        console.log("\n🔄 ===== FETCHING VIDEO =====");
        console.log("   Video ID:", id);

        // ✅ Parallel fetch for better performance
        const [videoRes, allVideosRes] = await Promise.all([
          axiosInstance.get(`/video/${id}`),
          axiosInstance.get("/video/getall"),
        ]);

        console.log("✅ Video API Response:", videoRes.data);

        if (videoRes.data.success && videoRes.data.video) {
          const newVideo = {
            ...videoRes.data.video,
            filepath: fixMediaURL(videoRes.data.video.filepath),
            videothumbnail: fixMediaURL(videoRes.data.video.videothumbnail),
            uploadedBy: videoRes.data.video.uploadedBy
              ? {
                  ...videoRes.data.video.uploadedBy,
                  image: fixMediaURL(videoRes.data.video.uploadedBy.image),
                  bannerImage: fixMediaURL(
                    videoRes.data.video.uploadedBy.bannerImage
                  ),
                }
              : null,
          };

          // ✅ Update all videos list
          if (
            allVideosRes.data.success &&
            Array.isArray(allVideosRes.data.videos)
          ) {
            setAllVideos(allVideosRes.data.videos);
            console.log("📚 Loaded", allVideosRes.data.videos.length, "videos");
          }
        } else {
          console.error("❌ Video not found in response");
          setError("Video not found");
        }
      } catch (error: any) {
        console.error("❌ Error fetching video:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        setError(error.response?.data?.message || "Failed to load video");
        lastFetchedIdRef.current = null; // Reset on error to allow retry
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
        console.log("===== FETCH COMPLETE =====\n");
      }
    };

    fetchVideo();
  }, [id]);

  // ✅ Debug related videos data
  useEffect(() => {
    if (relatedVideos.length > 0) {
      console.log(
        "🎥 Related Videos Debug:",
        relatedVideos.map((v) => ({
          title: v.videotitle,
          avatar: v.uploadedBy?.image,
          channelName: v.uploadedBy?.channelname || v.uploadedBy?.name,
          uploadedById: v.uploadedBy?._id,
        }))
      );
    }
  }, [relatedVideos]);

  // ✅ Fetch related videos separately
  useEffect(() => {
    const fetchRelatedVideos = async () => {
      if (!id || typeof id !== "string") return;

      try {
        console.log("🎥 Fetching related videos for:", id);
        const response = await axiosInstance.get(`/video/${id}/related`, {
          params: { limit: 20 },
        });

        if (response.data.success && Array.isArray(response.data.data)) {
          console.log("✅ Loaded", response.data.data.length, "related videos");
          setRelatedVideos(response.data.data);
        }
      } catch (error: any) {
        console.error("❌ Error fetching related videos:", error);

        // ✅ Fallback to all videos if related videos API fails
        try {
          console.log("🔄 Using fallback: filtering from all videos");
          if (allVideos.length > 0) {
            const filtered = allVideos.filter((v: any) => v._id !== id);
            setRelatedVideos(filtered);
            console.log("✅ Fallback loaded", filtered.length, "videos");
          }
        } catch (fallbackError) {
          console.error("❌ Error in fallback:", fallbackError);
          setRelatedVideos([]);
        }
      }
    };

    // Only fetch related videos after current video is loaded
    if (currentVideo) {
      fetchRelatedVideos();
    }
  }, [id, currentVideo, allVideos]);

  // ✅ Handle share modal from URL query
  useEffect(() => {
    if (router.query.share === "true") {
      console.log("🔗 Opening share modal from URL");
      setIsShareModalOpen(true);
    }
  }, [router.query.share]);

  // ✅ Scroll to comments handler
  const handleShowComments = () => {
    console.log("💬 Scrolling to comments");
    commentsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // ✅ Share modal handlers
  const handleOpenShareModal = (currentTime?: number) => {
    if (currentTime !== undefined) {
      console.log("📤 Opening share modal at time:", currentTime);
      setCurrentVideoTime(currentTime);
    }
    setIsShareModalOpen(true);
  };

  const handleCloseShareModal = () => {
    console.log("❌ Closing share modal");
    setIsShareModalOpen(false);

    // Remove share query param from URL
    if (router.query.share) {
      const { share, ...restQuery } = router.query;
      router.replace(
        {
          pathname: router.pathname,
          query: restQuery,
        },
        undefined,
        { shallow: true }
      );
    }
  };

  // ✅ Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-youtube-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-youtube-primary font-medium">Loading video...</p>
        </div>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-youtube-primary">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-2 text-red-500">
            Error Loading Video
          </h2>
          <p className="text-youtube-secondary mb-6 text-sm md:text-base">
            {error}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm md:text-base font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // ✅ Video not found state
  if (!currentVideo) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-youtube-primary">
        <div className="text-center max-w-md">
          <div className="text-youtube-secondary mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-2 text-youtube-primary">
            Video Not Found
          </h2>
          <p className="text-youtube-secondary mb-6 text-sm md:text-base">
            The video you are looking for does not exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm md:text-base font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // ✅ Main video watch page
  return (
    <div className="w-full bg-youtube-primary min-h-screen">
      <div className="w-full max-w-[1920px] mx-auto">
        {/* Changed lg:p-6 to lg:pt-6 lg:px-6 (removes mobile padding) */}
        <div className="flex flex-col lg:flex-row lg:gap-6 lg:px-6 lg:pt-6">
          {/* Main Content Column */}
          <div className="flex-1 lg:max-w-[calc(100%-424px)] w-full overflow-x-hidden">
            {/* Video Player Container - Edge to edge on mobile */}
            <div className="w-full sticky top-0 z-20 bg-black md:relative md:rounded-xl md:overflow-hidden md:shadow-lg">
              <GestureVideoPlayer
                video={currentVideo}
                allVideos={allVideos}
                onShowComments={handleShowComments}
                onShare={handleOpenShareModal}
              />
            </div>

            {/* Video Info - Add padding only here for mobile */}
            <div className="w-full mt-0 md:mt-3">
              <VideoInfo
                key={`video-info-${currentVideo._id}`}
                video={currentVideo}
                onShare={handleOpenShareModal}
              />
            </div>

            {/* Comments */}
            <div
              ref={commentsRef}
              className="px-4 lg:px-0 pt-4 pb-8 border-t border-gray-200 dark:border-gray-800 md:border-none"
            >
              <Comments
                key={`comments-${currentVideo._id}`}
                videoId={currentVideo._id}
              />
            </div>

            {/* ⚠️ CRITICAL FIX: Mobile Related Videos - MOVED INSIDE MAIN CONTENT */}
            <div className="lg:hidden border-t-4 border-gray-200 dark:border-[#272727] pt-4 pb-24">
              {relatedVideos && relatedVideos.length > 0 ? (
                <div className="px-0">
                  <RelatedVideos videos={relatedVideos} />
                </div>
              ) : (
                <div className="text-center py-8 px-4">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mt-4 text-sm">
                    Loading related videos...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Related Videos Sidebar - Desktop Only */}
          <div className="hidden lg:block w-[400px] flex-shrink-0">
            <div className="sticky top-6 max-h-[calc(100vh-48px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {relatedVideos && relatedVideos.length > 0 ? (
                <RelatedVideos videos={relatedVideos} />
              ) : (
                <div className="text-center py-8">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mt-4">
                    Loading...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {currentVideo && (
        <ShareModal
          key={`share-modal-${currentVideo._id}`}
          isOpen={isShareModalOpen}
          onClose={handleCloseShareModal}
          videoId={currentVideo._id}
          videoTitle={currentVideo.videotitle}
          currentTime={currentVideoTime}
        />
      )}
    </div>
  );
};

export default WatchPage;
