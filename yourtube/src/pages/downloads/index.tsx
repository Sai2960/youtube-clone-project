/* eslint-disable react-hooks/exhaustive-deps */

// FRONTEND/pages/downloads/index.tsx
import React from "react";
import { useUser } from "../../lib/AuthContext";
import { useSubscription } from "../../lib/SubscriptionContext";
import { useState, useEffect } from "react";
import {
  Download,
  Crown,
  Calendar,
  FileVideo,
  Trash2,
  ExternalLink,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { GetServerSideProps } from "next";

interface DownloadItem {
  _id: string;
  videoTitle: string;
  quality: string;
  fileSize: number;
  downloadUrl: string;
  downloadedAt: string;
  expiresAt: string;
  isExpired: boolean;
}

export default function DownloadsPage() {
  const { user } = useUser();
  const { subscription } = useSubscription();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchDownloads();
      fetchStats();
    }
  }, [user]);

  const fetchDownloads = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/download/history/${user._id}`
      );
      const data = await response.json();
      setDownloads(data.downloads || []);
    } catch (error) {
      console.error("Error fetching downloads:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/download/stats/${user._id}`
      );
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const deleteDownload = async (downloadId: string) => {
    if (!confirm("Are you sure you want to delete this download record?"))
      return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/download/${downloadId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: user?._id }),
        }
      );

      if (response.ok) {
        setDownloads(downloads.filter((d) => d._id !== downloadId));
      }
    } catch (error) {
      console.error("Error deleting download:", error);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-white dark:bg-neutral-950 px-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <FileVideo className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Sign in to access downloads
          </h2>
          <p className="text-gray-500 dark:text-neutral-400 text-sm">
            Create an account to start downloading videos
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-white dark:bg-neutral-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500/30 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const isPremium = subscription?.planType === "premium";

  return (
    <div className="flex-1 min-h-screen bg-gray-50 dark:bg-neutral-950">
      {/* Header Section */}
      <div className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Your Downloads
              </h1>
              <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1 hidden sm:block">
                Manage and access your downloaded content
              </p>
            </div>
            {isPremium && (
              <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-xs sm:text-sm font-semibold text-yellow-600 dark:text-yellow-500">
                  Premium
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Cards - Redesigned for Mobile */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Total Downloads */}
            <div className="relative overflow-hidden bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-gray-200 dark:border-neutral-800 shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">
                    Total Downloads
                  </p>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <FileVideo className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalDownloads}
                </p>
              </div>
            </div>

            {/* Today's Downloads */}
            <div className="relative overflow-hidden bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-gray-200 dark:border-neutral-800 shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">
                    Today's Downloads
                  </p>
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Download className="w-5 h-5 text-green-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.todayDownloads || 0}
                </p>
              </div>
            </div>

            {/* Remaining Today */}
            <div className="relative overflow-hidden bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-gray-200 dark:border-neutral-800 shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">
                    Remaining Today
                  </p>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.subscription?.remainingDownloads === "unlimited" ||
                  isPremium ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-purple-500" />
                      <span className="text-xl">unlimited</span>
                    </span>
                  ) : (
                    stats.subscription?.remainingDownloads || 0
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Downloads List - Redesigned */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Download History
              </h2>
            </div>
            {downloads.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-neutral-400 bg-gray-100 dark:bg-neutral-800 px-2 py-1 rounded-full">
                {downloads.length} {downloads.length === 1 ? "file" : "files"}
              </span>
            )}
          </div>

          <div className="p-4 sm:p-6">
            {downloads.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center">
                  <FileVideo className="w-10 h-10 text-gray-400 dark:text-neutral-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No downloads yet
                </h3>
                <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
                  Start downloading videos to see them here
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-500/25 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Browse Videos
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {downloads.map((download) => (
                  <div
                    key={download._id}
                    className="group relative bg-gray-50 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl p-4 transition-all border border-transparent hover:border-gray-200 dark:hover:border-neutral-700"
                  >
                    <div className="flex items-start gap-4">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-16 h-12 sm:w-20 sm:h-14 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-neutral-700 dark:to-neutral-600 rounded-lg flex items-center justify-center overflow-hidden">
                        <FileVideo className="w-6 h-6 text-gray-400 dark:text-neutral-500" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base line-clamp-2 leading-snug mb-2">
                          {download.videoTitle}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-neutral-400">
                          <span className="inline-flex items-center px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md font-medium">
                            {download.quality}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span>
                            {(download.fileSize / (1024 * 1024)).toFixed(2)} MB
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(
                              download.downloadedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        {download.isExpired && (
                          <span className="inline-flex items-center mt-2 px-2 py-1 text-xs bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg font-medium">
                            Link Expired
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {!download.isExpired && (
                          <a
                            href={download.downloadUrl}
                            download
                            className="p-2.5 sm:p-3 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all active:scale-95"
                            title="Download"
                          >
                            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                          </a>
                        )}
                        <button
                          onClick={() => deleteDownload(download._id)}
                          className="p-2.5 sm:p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-95"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {},
  };
};
