/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import axiosInstance from "@/lib/axiosinstance";

const SearchResult = ({ query }: any) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query?.trim()) {
      fetchVideos();
    } else {
      setVideos([]);
      setLoading(false);
    }
  }, [query]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/video/getall");
      
      if (res.data.success && Array.isArray(res.data.videos)) {
        const filtered = res.data.videos.filter(
          (vid: any) =>
            vid.videotitle?.toLowerCase().includes(query.toLowerCase()) ||
            vid.videochanel?.toLowerCase().includes(query.toLowerCase()) ||
            vid.videodescription?.toLowerCase().includes(query.toLowerCase())
        );
        setVideos(filtered);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const getVideoUrl = (video: any) => {
    if (video?.videofilename) {
      return `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/videos/${video.videofilename}`;
    } else if (video?.filepath) {
      const filename = video.filepath.split(/[\\/]/).pop();
      return `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/videos/${filename}`;
    }
    return "/video/vdo.mp4";
  };

  if (!query?.trim()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-youtube-secondary">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-lg">Enter a search term to find videos</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 px-4 py-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-80 aspect-video bg-youtube-secondary rounded-xl skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-youtube-secondary rounded skeleton w-3/4" />
              <div className="h-4 bg-youtube-secondary rounded skeleton w-1/2" />
              <div className="h-4 bg-youtube-secondary rounded skeleton w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-youtube-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-youtube-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-youtube-primary mb-2">No results found</h2>
          <p className="text-youtube-secondary">
            Try different keywords or check your spelling
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-6 max-w-[1280px] mx-auto">
      <div className="text-youtube-secondary text-sm mb-4">
        About {videos.length} results for "{query}"
      </div>

      {videos.map((video: any) => (
        <div key={video._id} className="flex gap-4 group">
          <Link href={`/watch/${video._id}`} className="flex-shrink-0">
            <div className="relative w-80 aspect-video bg-youtube-secondary rounded-xl overflow-hidden">
              <video
                src={getVideoUrl(video)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                preload="metadata"
              />
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-90 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
                {video.duration || '10:24'}
              </div>
            </div>
          </Link>

          <div className="flex-1 min-w-0 py-1">
            <Link href={`/watch/${video._id}`}>
              <h3 className="font-medium text-lg leading-6 line-clamp-2 text-youtube-primary group-hover:text-primary transition-colors mb-2">
                {video.videotitle}
              </h3>
            </Link>

            <div className="flex items-center gap-2 text-sm text-youtube-secondary mb-2">
              <span>{(video.views || 0).toLocaleString()} views</span>
              <span>•</span>
              <span>
                {video.createdAt
                  ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })
                  : 'Recently uploaded'}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-youtube-hover text-youtube-primary text-xs">
                  {video.videochanel?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-youtube-secondary hover:text-youtube-primary transition-colors cursor-pointer">
                {video.videochanel || 'Unknown Channel'}
              </span>
            </div>

            <p className="text-sm text-youtube-secondary line-clamp-2 leading-5">
              {video.videodescription || 'No description available'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchResult;