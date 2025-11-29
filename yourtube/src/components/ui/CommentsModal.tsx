// src/components/ui/CommentsModal.tsx - COMPLETE FIXED VERSION

import React, { useState, useEffect } from 'react';
import { X, Send, ThumbsUp, ThumbsDown, MoreVertical, Trash2, Flag, AlertTriangle, Languages, Globe } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/router';

interface Comment {
  _id: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string;
    image?: string;
    channelName?: string;
    channelname?: string;
  };
  text: string;
  likesCount?: number;
  dislikesCount?: number;
  likes?: string[];
  dislikes?: string[];
  hasLiked?: boolean;
  hasDisliked?: boolean;
  createdAt: string;
  translatedText?: string;
  showTranslation?: boolean;
  translationLanguage?: string;
  originalText?: string;
}

interface CommentsModalProps {
  shortId: string;
  commentsCount: number;
  onClose: () => void;
  onCommentAdded?: () => void;
}

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
];

const CommentsModal: React.FC<CommentsModalProps> = ({ 
  shortId, 
  commentsCount, 
  onClose,
  onCommentAdded 
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [reportModalId, setReportModalId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTranslationMenu, setShowTranslationMenu] = useState<string | null>(null);
  const [translatingCommentId, setTranslatingCommentId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const extractUserId = () => {
      let userId = localStorage.getItem('userId');
      
      if (!userId) {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.userId || payload.id || payload._id;
            
            if (userId) {
              localStorage.setItem('userId', userId);
            }
          } catch (error) {
            console.error('❌ Error parsing token:', error);
          }
        }
      }
      
      setCurrentUserId(userId);
      console.log('🔑 Current User ID set:', userId);
      
      return userId;
    };

    const userId = extractUserId();
    if (!userId) {
      console.warn('⚠️ No user ID found - user may not be logged in');
    }
    
    fetchComments();
  }, [shortId]);

  const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || "https://youtube-clone-project-q3pd.onrender.com";
  };
  

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError('');
      const apiUrl = getApiUrl();
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      console.log('📥 Fetching comments for short:', shortId);
      
      const response = await axios.get(
        `${apiUrl}/api/shorts/${shortId}/comments`,
        token ? { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        } : { timeout: 10000 }
      );

      console.log('✅ Comments fetched:', response.data);

      if (response.data.success) {
        setComments(response.data.data || []);
      } else {
        setComments([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching comments:', error);
      setError('Failed to load comments');
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedComment = newComment.trim();
    if (!trimmedComment) {
      setError('Comment cannot be empty');
      return;
    }

    if (trimmedComment.length > 1000) {
      setError('Comment is too long (max 1000 characters)');
      return;
    }

    try {
      if (!currentUserId) {
        console.log('❌ User not logged in');
        router.push(`/login?redirect=/shorts/${shortId}`);
        return;
      }

      setSubmitting(true);
      setError('');
      const apiUrl = getApiUrl();
      
      console.log('📤 Posting comment');
      console.log('   User ID:', currentUserId);
      console.log('   Comment:', trimmedComment);
      
      const response = await axios.post(
        `${apiUrl}/api/shorts/${shortId}/comment`,
        { text: trimmedComment },
        { 
          headers: getAuthHeaders(),
          timeout: 15000
        }
      );

      console.log('✅ Comment posted:', response.data);

      if (response.data.success) {
        const newCommentData = response.data.data;
        setComments([newCommentData, ...comments]);
        setNewComment('');
        
        if (onCommentAdded) {
          onCommentAdded();
        }

        showToast('✅ Comment posted!', 'success');
      }
    } catch (error: any) {
      console.error('❌ Error posting comment:', error);
      
      let errorMessage = 'Failed to post comment';
      
      if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
        setTimeout(() => router.push(`/login?redirect=/shorts/${shortId}`), 2000);
      } else if (error.message === 'No authentication token found') {
        errorMessage = 'Please login to comment';
        setTimeout(() => router.push(`/login?redirect=/shorts/${shortId}`), 1000);
      }
      
      setError(errorMessage);
      showToast(`❌ ${errorMessage}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      if (!currentUserId) {
        console.log('❌ User not logged in');
        router.push(`/login?redirect=/shorts/${shortId}`);
        return;
      }

      const apiUrl = getApiUrl();
      const response = await axios.post(
        `${apiUrl}/api/shorts/${shortId}/comments/${commentId}/like`,
        {},
        { 
          headers: getAuthHeaders(),
          timeout: 10000
        }
      );

      if (response.data.success) {
        setComments(comments.map(comment => 
          comment._id === commentId 
            ? { 
                ...comment, 
                hasLiked: response.data.data.hasLiked,
                hasDisliked: false,
                likesCount: response.data.data.likesCount,
                dislikesCount: response.data.data.dislikesCount
              }
            : comment
        ));
      }
    } catch (error: any) {
      console.error('❌ Error liking comment:', error);
      if (error.response?.status === 401 || error.message === 'No authentication token found') {
        router.push(`/login?redirect=/shorts/${shortId}`);
      } else {
        showToast('❌ Failed to like comment', 'error');
      }
    }
  };

  const handleDislikeComment = async (commentId: string) => {
    try {
      if (!currentUserId) {
        router.push(`/login?redirect=/shorts/${shortId}`);
        return;
      }

      const apiUrl = getApiUrl();
      const response = await axios.post(
        `${apiUrl}/api/shorts/${shortId}/comments/${commentId}/dislike`,
        {},
        { 
          headers: getAuthHeaders(),
          timeout: 10000
        }
      );

      if (response.data.success) {
        setComments(comments.map(comment => 
          comment._id === commentId 
            ? { 
                ...comment, 
                hasDisliked: response.data.data.hasDisliked,
                hasLiked: false,
                likesCount: response.data.data.likesCount,
                dislikesCount: response.data.data.dislikesCount
              }
            : comment
        ));
      }
    } catch (error: any) {
      console.error('❌ Error disliking comment:', error);
      if (error.response?.status === 401 || error.message === 'No authentication token found') {
        router.push(`/login?redirect=/shorts/${shortId}`);
      } else {
        showToast('❌ Failed to dislike comment', 'error');
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    console.log('🗑️ Deleting comment:', commentId);
    setIsDeleting(true);
    try {
      if (!currentUserId) {
        router.push(`/login?redirect=/shorts/${shortId}`);
        return;
      }

      const apiUrl = getApiUrl();
      console.log('📤 DELETE request to:', `${apiUrl}/api/shorts/${shortId}/comments/${commentId}`);
      
      const response = await axios.delete(
        `${apiUrl}/api/shorts/${shortId}/comments/${commentId}`,
        { 
          headers: getAuthHeaders(),
          timeout: 10000
        }
      );

      console.log('✅ Delete response:', response.data);

      if (response.data.success) {
        setComments(comments.filter(comment => comment._id !== commentId));
        setDeleteConfirmId(null);
        setOpenMenuId(null);
        showToast('✅ Comment deleted', 'success');
        
        if (onCommentAdded) {
          onCommentAdded();
        }
      }
    } catch (error: any) {
      console.error('❌ Error deleting comment:', error);
      if (error.response?.status === 401 || error.message === 'No authentication token found') {
        router.push(`/login?redirect=/shorts/${shortId}`);
      } else {
        showToast('❌ Failed to delete comment', 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReportComment = async () => {
    if (!reportReason) {
      showToast('❌ Please select a reason', 'error');
      return;
    }

    setIsReporting(true);
    try {
      if (!currentUserId) {
        router.push(`/login?redirect=/shorts/${shortId}`);
        return;
      }

      const apiUrl = getApiUrl();
      await axios.post(
        `${apiUrl}/api/shorts/${shortId}/comments/${reportModalId}/report`,
        { 
          reason: reportReason,
          details: reportDetails
        },
        { 
          headers: getAuthHeaders(),
          timeout: 10000
        }
      );

      setReportModalId(null);
      setReportReason('');
      setReportDetails('');
      setOpenMenuId(null);
      showToast('✅ Comment reported', 'success');
    } catch (error: any) {
      console.error('❌ Error reporting comment:', error);
      if (error.response?.status === 401 || error.message === 'No authentication token found') {
        router.push(`/login?redirect=/shorts/${shortId}`);
      } else {
        showToast('❌ Failed to report comment', 'error');
      }
    } finally {
      setIsReporting(false);
    }
  };

  const handleTranslateComment = async (commentId: string, targetLanguage: string) => {
    console.log('🌐 Translating comment:', commentId, 'to', targetLanguage);
    
    setTranslatingCommentId(commentId);
    setShowTranslationMenu(null);
    
    try {
      const apiUrl = getApiUrl();
      const response = await axios.post(
        `${apiUrl}/api/shorts/${shortId}/comments/${commentId}/translate`,
        { targetLanguage },
        { 
          headers: getAuthHeaders(),
          timeout: 20000 
        }
      );

      if (response.data.success) {
        console.log('✅ Translation successful');
        
        setComments(comments.map(comment => {
          if (comment._id === commentId) {
            return {
              ...comment,
              translatedText: response.data.translatedText,
              showTranslation: true,
              translationLanguage: targetLanguage,
              originalText: comment.text
            };
          }
          return comment;
        }));
        
        showToast('✅ Translation complete!', 'success');
      }
    } catch (error: any) {
      console.error('❌ Translation error:', error);
      showToast('❌ Translation failed', 'error');
    } finally {
      setTranslatingCommentId(null);
    }
  };

  const handleShowOriginal = (commentId: string) => {
    setComments(comments.map(comment => {
      if (comment._id === commentId) {
        return { ...comment, showTranslation: false };
      }
      return comment;
    }));
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const div = document.createElement('div');
    div.innerHTML = message;
    div.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#22c55e' : '#ef4444'};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(div);
    setTimeout(() => {
      if (document.body.contains(div)) {
        document.body.removeChild(div);
      }
    }, 3000);
  };

  const formatTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (seconds < 60) return 'just now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
      if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
      return `${Math.floor(seconds / 2592000)}mo ago`;
    } catch (error) {
      return '';
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  };

  const getUserAvatar = () => {
    const avatar = localStorage.getItem('userAvatar') || 
                   localStorage.getItem('userImage');
    if (!avatar || avatar.includes('placeholder')) return DEFAULT_AVATAR;
    return avatar;
  };

  const reportReasons = [
    'Spam or misleading',
    'Hateful or abusive content',
    'Harassment or bullying',
    'Sexual content',
    'Violent or graphic content',
    'Misinformation',
    'Other'
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/85"
      onClick={onClose}
    >
      <div 
        className="bg-youtube-secondary rounded-t-3xl md:rounded-3xl w-full md:w-[600px] h-[80vh] md:h-[700px] flex flex-col shadow-2xl border-t border-youtube md:border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-youtube">
          <h2 className="text-xl font-semibold text-youtube-primary">
            Comments {commentsCount > 0 && `(${formatCount(commentsCount)})`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-youtube-hover transition-colors"
          >
            <X className="w-5 h-5 text-youtube-primary" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 bg-youtube-secondary"> 
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-youtube-secondary">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg">No comments yet</p>
              <p className="text-sm mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const userAvatar = comment.userId?.avatar || comment.userId?.image || DEFAULT_AVATAR;
                const userName = comment.userId?.channelName || comment.userId?.channelname || comment.userId?.name || 'User';
                const commentLikesCount = comment.likesCount || comment.likes?.length || 0;
                const commentDislikesCount = comment.dislikesCount || comment.dislikes?.length || 0;
                const hasLiked = comment.hasLiked || (currentUserId && comment.likes?.includes(currentUserId));
                const hasDisliked = comment.hasDisliked || (currentUserId && comment.dislikes?.includes(currentUserId));
                
                const isOwnComment = !!(currentUserId && comment.userId?._id && 
                  currentUserId.toString() === comment.userId._id.toString());
                
                return (
                  <div key={comment._id} className="flex gap-3">
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="w-10 h-10 rounded-full flex-shrink-0 object-cover bg-youtube-tertiary"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_AVATAR;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm truncate text-youtube-primary">
                          @{userName}
                        </span>
                        <span className="text-xs flex-shrink-0 text-youtube-secondary">
                          {formatTimeAgo(comment.createdAt)}
                        </span>
                      </div>
                      
                      {/* Comment Text with Translation */}
                      <div className="mb-2">
                        <p className="text-sm mb-2 break-words select-text cursor-text text-youtube-primary">
                          {comment.showTranslation ? comment.translatedText : comment.text}
                        </p>
                        
                        {/* Translation Badge */}
                        {comment.showTranslation && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                              Translated to {SUPPORTED_LANGUAGES.find(l => l.code === comment.translationLanguage)?.name}
                            </span>
                            <button
                              onClick={() => handleShowOriginal(comment._id)}
                              className="text-xs text-blue-400 hover:underline"
                            >
                              Show original
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Comment Actions */}
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLikeComment(comment._id)}
                          className="flex items-center gap-1 group"
                        >
                          <ThumbsUp 
                            size={16} 
                            className={`${
                              hasLiked
                                ? 'text-blue-500 fill-blue-500' 
                                : 'text-youtube-secondary group-hover:text-youtube-primary'
                            } transition`}
                          />
                          {commentLikesCount > 0 && (
                            <span className={`text-xs ${
                              hasLiked ? 'text-blue-500' : 'text-youtube-secondary'
                            }`}>
                              {formatCount(commentLikesCount)}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => handleDislikeComment(comment._id)}
                          className="flex items-center gap-1 group"
                        >
                          <ThumbsDown 
                            size={16} 
                            className={`${
                              hasDisliked
                                ? 'text-red-500 fill-red-500' 
                                : 'text-youtube-secondary group-hover:text-youtube-primary'
                            } transition`}
                          />
                          {commentDislikesCount > 0 && (
                            <span className={`text-xs ${
                              hasDisliked ? 'text-red-500' : 'text-youtube-secondary'
                            }`}>
                              {formatCount(commentDislikesCount)}
                            </span>
                          )}
                        </button>

                        {/* Translate Button with Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setShowTranslationMenu(
                              showTranslationMenu === comment._id ? null : comment._id
                            )}
                            disabled={translatingCommentId === comment._id}
                            className="flex items-center gap-1 group"
                          >
                            {translatingCommentId === comment._id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-youtube-secondary border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs text-youtube-secondary">Translating...</span>
                              </>
                            ) : (
                              <>
                                <Languages size={16} className="text-youtube-secondary group-hover:text-youtube-primary transition" />
                                <span className="text-xs text-youtube-secondary group-hover:text-youtube-primary transition">
                                  Translate
                                </span>
                              </>
                            )}
                          </button>

                          {/* Translation Dropdown */}
                          {showTranslationMenu === comment._id && (
                            <div className="absolute left-0 top-full mt-1 bg-youtube-tertiary rounded-lg shadow-xl overflow-hidden min-w-[160px] z-50 max-h-[300px] overflow-y-auto border border-youtube">
                              <div className="px-3 py-2 bg-youtube-hover sticky top-0">
                                <span className="text-xs text-youtube-secondary font-medium">Translate to:</span>
                              </div>
                              {SUPPORTED_LANGUAGES.map((lang) => (
                                <button
                                  key={lang.code}
                                  onClick={() => handleTranslateComment(comment._id, lang.code)}
                                  className="w-full px-4 py-2 text-left text-youtube-primary hover:bg-youtube-hover flex items-center gap-2 transition text-sm"
                                >
                                  <Globe size={14} />
                                  {lang.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="relative ml-auto">
                          <button 
                            onClick={() => setOpenMenuId(openMenuId === comment._id ? null : comment._id)}
                            className="text-youtube-secondary hover:text-youtube-primary transition"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuId === comment._id && (
                            <div className="absolute right-0 top-full mt-1 bg-youtube-tertiary rounded-lg shadow-xl overflow-hidden min-w-[160px] z-50 border border-youtube">
                              {isOwnComment && (
                                <button
                                  onClick={() => {
                                    setDeleteConfirmId(comment._id);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-red-400 hover:bg-youtube-hover flex items-center gap-2 transition text-sm border-b border-youtube"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setReportModalId(comment._id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-youtube-primary hover:bg-youtube-hover flex items-center gap-2 transition text-sm"
                              >
                                <Flag size={14} />
                                Report
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-youtube bg-youtube-secondary">
          <form onSubmit={handleSubmitComment} className="flex gap-3">
            <img
              src={getUserAvatar()}
              alt="You"
              className="w-10 h-10 rounded-full flex-shrink-0 object-cover bg-youtube-tertiary"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
            />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  setError('');
                }}
                placeholder="Add a comment..."
                className="flex-1 bg-youtube-tertiary text-youtube-primary border border-youtube rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-youtube-tertiary disabled:cursor-not-allowed text-white rounded-full p-2 transition"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/95 z-[999999]"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div 
            className="bg-youtube-secondary rounded-2xl p-6 max-w-md w-full border border-youtube shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-500/20 p-2 rounded-full">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-youtube-primary">Delete Comment?</h3>
            </div>
            
            <p className="text-youtube-secondary mb-6">
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-youtube-tertiary text-youtube-primary rounded-lg hover:bg-youtube-hover transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteComment(deleteConfirmId)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Comment Modal */}
      {reportModalId && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/95 z-[999999]"
          onClick={() => setReportModalId(null)}
        >
          <div 
            className="bg-youtube-secondary rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-youtube shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-2 rounded-full">
                  <Flag size={20} className="text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-youtube-primary">Report Comment</h3>
              </div>
              <button
                onClick={() => setReportModalId(null)}
                className="text-youtube-secondary hover:text-youtube-primary transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-youtube-secondary mb-4 text-sm">
              Help us understand what's wrong with this comment
            </p>

            <div className="space-y-2 mb-4">
              {reportReasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
                    reportReason === reason
                      ? 'bg-blue-600 text-white'
                      : 'bg-youtube-tertiary text-youtube-secondary hover:bg-youtube-hover'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Additional details (optional)"
              rows={3}
              className="w-full bg-youtube-tertiary border border-youtube rounded-lg px-3 py-2 text-youtube-primary placeholder-youtube-disabled focus:border-blue-600 focus:outline-none transition resize-none mb-4 text-sm"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setReportModalId(null)}
                disabled={isReporting}
                className="flex-1 px-4 py-2 bg-youtube-tertiary text-youtube-primary rounded-lg hover:bg-youtube-hover transition font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReportComment}
                disabled={isReporting || !reportReason}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isReporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentsModal;