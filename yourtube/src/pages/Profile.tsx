// src/pages/profile.tsx - COMPLETE MERGED VERSION

/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Crown, 
  Calendar, 
  FileVideo, 
  Trash2, 
  ExternalLink,
  TrendingUp,
  Clock,
  HardDrive
} from 'lucide-react';
import PremiumModal from '../components/PremiumModal';
import { useUser } from '../lib/AuthContext';
import axiosInstance from '../lib/axiosinstance';

interface Download {
  _id: string;
  videoTitle: string;
  quality: string;
  fileSize: number;
  downloadUrl: string;
  downloadedAt: string;
  expiresAt: string;
  isExpired: boolean;
  videoId: {
    videotitle: string;
    videodescription: string;
    videothumbnail: string;
  };
}

interface DownloadStats {
  totalDownloads: number;
  todayDownloads: number;
  thisMonthDownloads: number;
  subscription: {
    planType: string;
    canDownloadToday: boolean;
    remainingDownloads: string | number;
  };
}

interface Subscription {
  planType: string;
  planName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  features: {
    unlimitedDownloads: boolean;
    hdQuality: boolean;
    adFree: boolean;
    earlyAccess: boolean;
  };
  price?: number;
}

const Profile: React.FC = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'downloads' | 'subscription'>('downloads');
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [downloadStats, setDownloadStats] = useState<DownloadStats | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const userId = user?._id;

  useEffect(() => {
    if (userId) {
      fetchDownloadData();
      fetchSubscription();
    }
  }, [currentPage, userId]);

  const fetchDownloadData = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const [downloadsRes, statsRes] = await Promise.all([
        axiosInstance.get(`/download/history/${userId}?page=${currentPage}&limit=10`),
        axiosInstance.get(`/download/stats/${userId}`)
      ]);

      setDownloads(downloadsRes.data.downloads || []);
      setTotalPages(downloadsRes.data.pagination?.totalPages || 1);
      setDownloadStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching download data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubscription = async () => {
    if (!userId) return;
    
    try {
      const response = await axiosInstance.get(`/subscription/user/${userId}`);
      if (response.data.success) {
        setSubscription(response.data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const deleteDownload = async (downloadId: string) => {
    if (!confirm('Are you sure you want to delete this download record?')) return;

    try {
      const response = await axiosInstance.delete(`/download/${downloadId}`, {
        data: { userId }
      });

      if (response.data.success) {
        setDownloads(downloads.filter(d => d._id !== downloadId));
      } else {
        alert('Failed to delete download record');
      }
    } catch (error) {
      console.error('Error deleting download:', error);
      alert('Failed to delete download record');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPremium = subscription?.planType !== 'free';

  if (!user) {
    return (
      <div className="min-h-screen bg-youtube-primary flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-youtube-primary mb-4">Please Login</h2>
          <p className="text-youtube-secondary">You need to be logged in to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-youtube-primary">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-youtube-secondary rounded-lg shadow-sm p-6 mb-6 border border-youtube">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-youtube-primary">Your Profile</h1>
              <p className="text-youtube-secondary mt-1">{user.email}</p>
              <div className="flex gap-4 mt-2 text-sm text-youtube-secondary">
                <span>Theme: {user.theme || 'dark'}</span>
                <span>OTP Method: {user.preferredOtpMethod || 'sms'}</span>
                {user.location?.state && <span>Location: {user.location.state}, {user.location.country}</span>}
              </div>
            </div>
            
            {subscription && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                isPremium 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-youtube-hover text-youtube-primary'
              }`}>
                {isPremium && <Crown className="w-4 h-4" />}
                <span className="font-medium">{subscription.planName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {downloadStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-youtube-secondary rounded-lg shadow-sm p-6 border border-youtube">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-youtube-secondary text-sm">Total Downloads</p>
                  <p className="text-2xl font-bold text-youtube-primary">{downloadStats.totalDownloads}</p>
                </div>
                <FileVideo className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-youtube-secondary rounded-lg shadow-sm p-6 border border-youtube">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-youtube-secondary text-sm">Today</p>
                  <p className="text-2xl font-bold text-youtube-primary">{downloadStats.todayDownloads}</p>
                </div>
                <Clock className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-youtube-secondary rounded-lg shadow-sm p-6 border border-youtube">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-youtube-secondary text-sm">This Month</p>
                  <p className="text-2xl font-bold text-youtube-primary">{downloadStats.thisMonthDownloads}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-youtube-secondary rounded-lg shadow-sm p-6 border border-youtube">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-youtube-secondary text-sm">Remaining Today</p>
                  <p className="text-2xl font-bold text-youtube-primary">
                    {downloadStats.subscription.remainingDownloads}
                  </p>
                </div>
                <Download className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-youtube-secondary rounded-lg shadow-sm border border-youtube">
          <div className="border-b border-youtube">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('downloads')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'downloads'
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-youtube-secondary hover:text-youtube-primary'
                }`}
              >
                <Download className="w-4 h-4 inline mr-2" />
                Downloads
              </button>
              <button
                onClick={() => setActiveTab('subscription')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'subscription'
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-youtube-secondary hover:text-youtube-primary'
                }`}
              >
                <Crown className="w-4 h-4 inline mr-2" />
                Subscription
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Downloads Tab */}
            {activeTab === 'downloads' && (
              <div>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-youtube-secondary">Loading downloads...</p>
                  </div>
                ) : downloads.length === 0 ? (
                  <div className="text-center py-8">
                    <FileVideo className="w-16 h-16 text-youtube-secondary mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-youtube-primary">No downloads yet</h3>
                    <p className="text-youtube-secondary mt-2">Start downloading videos to see them here</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {downloads.map((download) => (
                        <div key={download._id} className="flex items-center justify-between p-4 border border-youtube rounded-lg bg-youtube-tertiary">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-12 bg-youtube-hover rounded flex items-center justify-center">
                              <FileVideo className="w-6 h-6 text-youtube-secondary" />
                            </div>
                            <div>
                              <h4 className="font-medium text-youtube-primary">{download.videoTitle}</h4>
                              <div className="flex items-center space-x-4 mt-1 text-sm text-youtube-secondary">
                                <span>{download.quality}</span>
                                <span>{formatFileSize(download.fileSize)}</span>
                                <span>{formatDate(download.downloadedAt)}</span>
                              </div>
                              {download.isExpired && (
                                <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded dark:bg-red-900 dark:text-red-200">
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
                                className="p-2 text-blue-600 hover:bg-youtube-hover rounded-lg transition-colors"
                                title="Download"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => deleteDownload(download._id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center mt-6">
                        <nav className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm font-medium text-youtube-primary bg-youtube-hover border border-youtube rounded-md hover:bg-youtube-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                currentPage === page
                                  ? 'bg-blue-500 text-white'
                                  : 'text-youtube-primary bg-youtube-hover border border-youtube hover:bg-youtube-tertiary'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 text-sm font-medium text-youtube-primary bg-youtube-hover border border-youtube rounded-md hover:bg-youtube-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </nav>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <div>
                {subscription ? (
                  <div className="space-y-6">
                    {/* Current Plan */}
                    <div className="bg-youtube-tertiary rounded-lg p-6 border border-youtube">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-youtube-primary">Current Plan</h3>
                        {isPremium && <Crown className="w-6 h-6 text-yellow-500" />}
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <dl className="space-y-3">
                            <div>
                              <dt className="text-sm font-medium text-youtube-secondary">Plan</dt>
                              <dd className="text-lg font-semibold text-youtube-primary">{subscription.planName}</dd>
                            </div>
                            {subscription.price && (
                              <div>
                                <dt className="text-sm font-medium text-youtube-secondary">Price</dt>
                                <dd className="text-lg font-semibold text-youtube-primary">₹{subscription.price}</dd>
                              </div>
                            )}
                            <div>
                              <dt className="text-sm font-medium text-youtube-secondary">Status</dt>
                              <dd className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                                subscription.isActive 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {subscription.isActive ? 'Active' : 'Inactive'}
                              </dd>
                            </div>
                            {isPremium && subscription.endDate && (
                              <div>
                                <dt className="text-sm font-medium text-youtube-secondary">Valid Until</dt>
                                <dd className="text-lg font-semibold text-youtube-primary">
                                  {formatDate(subscription.endDate)}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-youtube-secondary mb-3">Features</h4>
                          <div className="space-y-2">
                            {[
                              { name: 'Unlimited Downloads', enabled: subscription.features.unlimitedDownloads },
                              { name: 'HD Quality', enabled: subscription.features.hdQuality },
                              { name: 'Ad-Free Experience', enabled: subscription.features.adFree },
                              { name: 'Early Access', enabled: subscription.features.earlyAccess }
                            ].map((feature) => (
                              <div key={feature.name} className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full ${
                                  feature.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}>
                                  {feature.enabled && (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                                <span className="text-sm text-youtube-primary">{feature.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center space-x-4">
                      {!isPremium ? (
                        <button
                          onClick={() => setShowPremiumModal(true)}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                        >
                          <Crown className="w-5 h-5 inline mr-2" />
                          Upgrade to Premium
                        </button>
                      ) : (
                        <div className="text-center">
                          <p className="text-youtube-secondary mb-4">Enjoying Premium? Thank you for your support!</p>
                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to cancel your subscription?')) {
                                try {
                                  const response = await axiosInstance.post('/subscription/cancel');
                                  if (response.data.success) {
                                    alert('Subscription cancelled successfully');
                                    fetchSubscription();
                                  }
                                } catch (error) {
                                  alert('Failed to cancel subscription');
                                }
                              }
                            }}
                            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Cancel Subscription
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Crown className="w-16 h-16 text-youtube-secondary mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-youtube-primary">No Subscription Found</h3>
                    <p className="text-youtube-secondary mt-2">Get started with a subscription plan</p>
                    <button
                      onClick={() => setShowPremiumModal(true)}
                      className="mt-4 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Plans
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Modal */}
      {showPremiumModal && userId && (
        <PremiumModal
          userId={userId}
          onClose={() => setShowPremiumModal(false)}
          onSubscribed={() => {
            setShowPremiumModal(false);
            fetchSubscription();
            fetchDownloadData();
          }}
        />
      )}
    </div>
  );
};

export default Profile;