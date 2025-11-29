/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";

const Videogrid = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await axiosInstance.get("/video/getall");
        
        console.log('✅ Videogrid API Response:', res.data);
        
        if (res.data.success && Array.isArray(res.data.videos)) {
          setVideos(res.data.videos);
          console.log(`✅ Loaded ${res.data.videos.length} videos`);
        } else {
          console.warn("❌ Unexpected API response:", res.data);
          setVideos([]);
          setError("No videos found");
        }
      } catch (error: any) {
        console.error("❌ Error fetching videos:", error);
        setError(error.response?.data?.message || error.message || "Failed to load videos");
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideo();
  }, []);

  if (loading) {
    return (
      <div className="video-grid">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="space-y-3">
            {/* Thumbnail Skeleton */}
            <div className="aspect-video bg-youtube-secondary rounded-xl skeleton" />
            
            {/* Info Skeleton */}
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-youtube-secondary rounded-full skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-youtube-secondary rounded skeleton" />
                <div className="h-3 bg-youtube-secondary rounded skeleton w-2/3" />
                <div className="h-3 bg-youtube-secondary rounded skeleton w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && videos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Unable to Load Videos
          </h3>
          <p className="text-red-600 dark:text-red-300 text-sm mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-6 py-2.5 rounded-full hover:bg-red-700 transition font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-youtube-secondary border border-youtube rounded-xl p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-youtube-hover rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-youtube-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-youtube-primary mb-2">
            No Videos Found
          </h3>
          <p className="text-youtube-secondary text-sm">
            There are no videos available at the moment. Upload your first video!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-grid">
      {videos.map((video: any) => (
        <Videocard key={video._id || video.id} video={video} />
      ))}
    </div>
  );
};

export default Videogrid;