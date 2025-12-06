/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// FRONTEND/pages/downloads/index.tsx
import React from 'react';
import { useUser } from '../../lib/AuthContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import { useState, useEffect } from 'react';
import { Download, Crown, Calendar, FileVideo, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/download/history/${user._id}`);
      const data = await response.json();
      setDownloads(data.downloads || []);
    } catch (error) {
      console.error('Error fetching downloads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/download/stats/${user._id}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const deleteDownload = async (downloadId: string) => {
    if (!confirm('Are you sure you want to delete this download record?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/download/${downloadId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?._id })
      });

      if (response.ok) {
        setDownloads(downloads.filter(d => d._id !== downloadId));
      }
    } catch (error) {
      console.error('Error deleting download:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FileVideo className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to access downloads</h2>
          <p className="text-gray-600">Create an account to start downloading videos</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Downloads</h1>
          <div className="flex items-center gap-2">
            {subscription?.planType === 'premium' && (
              <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                <Crown className="w-4 h-4" />
                Premium
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Downloads</p>
                  <p className="text-2xl font-bold">{stats.totalDownloads}</p>
                </div>
                <FileVideo className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Todays Downloads</p>
                  <p className="text-2xl font-bold">{stats.todayDownloads || 0}</p>
                </div>
                <Download className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Remaining Today</p>
                  <p className="text-2xl font-bold">
                    {stats.subscription?.remainingDownloads || 0}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Downloads List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Download History</h2>
          </div>

          <div className="p-6">
            {downloads.length === 0 ? (
              <div className="text-center py-8">
                <FileVideo className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No downloads yet</h3>
                <p className="text-gray-600 mt-2">Start downloading videos to see them here</p>
                <Link href="/" className="mt-4 inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Browse Videos
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {downloads.map((download) => (
                  <div key={download._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <FileVideo className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{download.videoTitle}</h4>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <span>{download.quality}</span>
                          <span>{(download.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                          <span>{new Date(download.downloadedAt).toLocaleDateString()}</span>
                        </div>
                        {download.isExpired && (
                          <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                            Link Expired
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!download.isExpired && (
                        <a
                          href={download.downloadUrl}
                          download
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => deleteDownload(download._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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