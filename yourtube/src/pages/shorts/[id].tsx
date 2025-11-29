// src/pages/shorts/[id].tsx - THEME-AWARE VERSION (FULLY FIXED)

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import ShortPlayer from '@/components/ui/ShortPlayer';

interface Short {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  shares: number;
  userId: {
    _id: string;
    name: string;
    avatar: string;
    channelName: string;
    subscribers: number;
  };
  channelName: string;
  channelAvatar: string;
  hasLiked?: boolean;
  hasDisliked?: boolean;
  createdAt: string;
}

const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || "https://youtube-clone-project-q3pd.onrender.com"


}';
};

const ShortDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [short, setShort] = useState<Short | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [relatedShorts, setRelatedShorts] = useState<Short[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchShort();
      fetchRelatedShorts();
    }
  }, [id]);

  const fetchShort = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      
      console.log('📡 Fetching short from:', `${apiUrl}/api/shorts/${id}`);
      
      const response = await axios.get(
        `${apiUrl}/api/shorts/${id}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      console.log('✅ Short response:', response.data);

      if (response.data.success) {
        setShort(response.data.data);
      } else {
        setError('Short not found');
      }
    } catch (error: any) {
      console.error('❌ Error fetching short:', error);
      setError(error.response?.data?.message || 'Failed to load short');
      
      setTimeout(() => {
        router.push('/shorts');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedShorts = async () => {
    try {
      const apiUrl = getApiUrl();
      
      console.log('📡 Fetching related shorts from:', `${apiUrl}/api/shorts?limit=20`);
      
      const response = await axios.get(
        `${apiUrl}/api/shorts?limit=20`
      );

      console.log('✅ Related shorts response:', response.data);

      if (response.data.success && Array.isArray(response.data.data)) {
        const filtered = response.data.data.filter((s: Short) => s._id !== id);
        setRelatedShorts(filtered);
      }
    } catch (error: any) {
      console.error('❌ Error fetching related shorts:', error);
    }
  };

  const handleShortDeleted = (deletedShortId: string) => {
    console.log('🗑️ Short deleted in [id].tsx:', deletedShortId);
    
    if (short && short._id === deletedShortId) {
      console.log('✅ Current short was deleted, navigating...');
      
      if (relatedShorts.length > 0) {
        const nextShort = relatedShorts[currentIndex];
        if (nextShort) {
          router.push(`/shorts/${nextShort._id}`);
          return;
        }
      }
      
      router.push('/shorts');
    }
  };

  const handleNext = () => {
    if (relatedShorts.length > 0) {
      const nextShort = relatedShorts[currentIndex];
      if (nextShort) {
        router.push(`/shorts/${nextShort._id}`);
        setCurrentIndex((prev) => (prev + 1) % relatedShorts.length);
      }
    } else {
      router.push('/shorts');
    }
  };

  const handlePrevious = () => {
    router.push('/shorts');
  };

  // ✅ LOADING STATE - Theme-aware
  if (loading) {
    return (
      <div className="h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <div className="text-[var(--text-primary)] text-xl">Loading Short...</div>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE - Theme-aware
  if (error) {
    return (
      <div className="h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">😕</div>
          <div className="text-[var(--text-primary)] text-xl mb-2">{error}</div>
          <p className="text-[var(--text-secondary)] mb-6">Redirecting to Shorts feed...</p>
        </div>
        <button
          onClick={() => router.push('/shorts')}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold transition"
        >
          Go to Shorts
        </button>
      </div>
    );
  }

  // ✅ NOT FOUND STATE - Theme-aware
  if (!short) {
    return (
      <div className="h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <div className="text-[var(--text-primary)] text-6xl mb-4">📹</div>
          <div className="text-[var(--text-primary)] text-xl mb-2">Short not found</div>
          <p className="text-[var(--text-secondary)] mb-6">This short may have been removed</p>
        </div>
        <button
          onClick={() => router.push('/shorts')}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold transition"
        >
          Go to Shorts
        </button>
      </div>
    );
  }

  // ✅ VIDEO PLAYER - Keeps black background (standard for video content)
  return (
    <div className="h-screen bg-black">
      <ShortPlayer
        short={short}
        isActive={true}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onDelete={handleShortDeleted}
      />
    </div>
  );
};

export default ShortDetailPage;