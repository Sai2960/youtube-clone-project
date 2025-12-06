/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import {
  ThumbsUp,
  ThumbsDown,
  MapPin,
  Languages,
  Flag,
  Globe,
  MoreVertical,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { getUserAvatar, DEFAULT_AVATAR_SVG } from "@/lib/imageUtils";

interface Translation {
  language: string;
  text: string;
  translatedAt: string;
}

interface Comment {
  _id: string;
  videoid: string;
  userid: any; // Can be string or user object
  userId?: any; // Alternative field name
  commentbody: string;
  usercommented: string;
  commentedon: string;
  originalText?: string;
  originalLanguage?: string;
  translations?: Translation[];
  location?: {
    city: string;
    country: string;
    countryCode: string;
  };
  likes?: number;
  dislikes?: number;
  userVote?: "like" | "dislike" | null;
  isHidden?: boolean;
  currentTranslation?: {
    text: string;
    language: string;
  } | null;
}

interface ReportCategory {
  id: string;
  label: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: "spam",
    label: "Spam or misleading",
    description: "Scams, commercial spam, or misleading content",
    severity: "low",
  },
  {
    id: "hate_speech",
    label: "Hateful or abusive content",
    description: "Promotes hatred or violence against individuals or groups",
    severity: "high",
  },
  {
    id: "harassment",
    label: "Harassment or bullying",
    description: "Threatens, harasses, or bullies an individual",
    severity: "high",
  },
  {
    id: "dangerous_acts",
    label: "Harmful or dangerous acts",
    description: "Encourages dangerous or illegal activities",
    severity: "high",
  },
  {
    id: "child_safety",
    label: "Child abuse",
    description: "Sexual, violent, or harmful content involving minors",
    severity: "critical",
  },
  {
    id: "terrorism",
    label: "Promotes terrorism",
    description: "Supports terrorist organizations or activities",
    severity: "critical",
  },
  {
    id: "sexual_content",
    label: "Sexual content",
    description: "Sexually explicit or inappropriate material",
    severity: "medium",
  },
  {
    id: "violence",
    label: "Violent or graphic content",
    description: "Graphic violence, gore, or disturbing imagery",
    severity: "high",
  },
  {
    id: "misinformation",
    label: "Misinformation",
    description: "False information that could cause harm",
    severity: "medium",
  },
  {
    id: "copyright",
    label: "Infringes my rights",
    description: "Copyright, trademark, or privacy violation",
    severity: "low",
  },
  {
    id: "other",
    label: "Other",
    description: "Something else that violates guidelines",
    severity: "low",
  },
];

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
  { code: "nl", name: "Dutch" },
  { code: "tr", name: "Turkish" },
];

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showTranslationOptions, setShowTranslationOptions] = useState<
    string | null
  >(null);
  const [translationLoading, setTranslationLoading] = useState<string | null>(
    null
  );
  const [reportedComments, setReportedComments] = useState<Set<string>>(
    new Set()
  );

  // Report Dialog States
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState("");

  // ============================================================================
  // HELPER FUNCTIONS FOR AVATAR AND USER DATA
  // ============================================================================

  const getCommentUserData = (comment: Comment) => {
    // Extract user data from either userid or userId field
    const userData = comment.userid || comment.userId;

    return {
      avatar: getUserAvatar({
        avatar: userData?.avatar,
        image: userData?.image,
      }),
      name:
        userData?.channelName ||
        userData?.channelname ||
        userData?.name ||
        comment.usercommented ||
        "Anonymous",
      userId: typeof userData === "string" ? userData : userData?._id,
    };
  };

  useEffect(() => {
    loadComments();
    getUserLocation();
  }, [videoId]);

  const getUserLocation = async () => {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_GEOLOCATION_API || "https://ipapi.co/json/"
      );
      const data = await response.json();
      setUserLocation({
        city: data.city || "Unknown",
        country: data.country_name || "Unknown",
        countryCode: data.country_code || "XX",
      });
      console.log("📍 User location detected:", data.city, data.country_name);
    } catch (error) {
      console.log("⚠️ Location detection failed, using fallback");
      setUserLocation({
        city: "Mumbai",
        country: "India",
        countryCode: "IN",
      });
    }
  };

  const loadComments = async () => {
    try {
      if (!videoId || videoId === "1" || videoId === "undefined") {
        console.log("⚠️ Invalid video ID, skipping comment load");
        setLoading(false);
        return;
      }

      console.log("📥 Loading comments for video:", videoId);
      const res = await axiosInstance.get(
        `/comment/${videoId}?userId=${user?._id || ""}`
      );
      console.log("✅ Loaded comments:", res.data.length);

      const enhancedComments = res.data.map((comment: any) => ({
        ...comment,
        originalText: comment.originalText || comment.commentbody,
        originalLanguage: comment.originalLanguage || "en",
        location: comment.location || {
          city: "Unknown",
          country: "Unknown",
          countryCode: "XX",
        },
        likes: comment.likes || 0,
        dislikes: comment.dislikes || 0,
        userVote: comment.userVote || null,
        translations: Array.isArray(comment.translations)
          ? comment.translations
          : [],
        currentTranslation: null,
        isHidden: comment.isHidden || false,
      }));

      setComments(enhancedComments.filter((c: Comment) => !c.isHidden));
    } catch (error: any) {
      console.error(
        "❌ Load comments error:",
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const validateComment = (text: string): boolean => {
    const dangerousPattern = /<script|javascript:|onerror=|onclick=/i;
    return (
      !dangerousPattern.test(text) &&
      text.trim().length > 0 &&
      text.length <= 1000
    );
  };

  const detectLanguage = (text: string): string => {
    if (/[\u0600-\u06FF]/.test(text)) return "ar";
    if (/[\u4e00-\u9fff]/.test(text)) return "zh";
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja";
    if (/[\uac00-\ud7af]/.test(text)) return "ko";
    if (/[\u0900-\u097f]/.test(text)) return "hi";
    if (/[а-яёА-ЯЁ]/.test(text)) return "ru";

    const cleanText = text.toLowerCase().trim();
    const patterns = {
      es: /\b(el|la|los|las|de|en|y|que|es|por|un|una|con|no|se|su|para|como|está|pero|más)\b/gi,
      fr: /\b(le|la|les|de|et|un|une|dans|est|pour|que|qui|ce|il|elle|en|au|pas|ne|se)\b/gi,
      de: /\b(der|die|das|und|in|zu|den|ist|für|von|mit|ein|eine|sich|nicht|auf|dem|des)\b/gi,
      pt: /\b(o|a|de|e|do|da|em|um|uma|para|com|não|se|na|por|mais|os|as|ou|ao)\b/gi,
      it: /\b(il|la|di|e|che|è|per|un|una|in|del|non|da|con|le|si|dei|delle|lo)\b/gi,
      nl: /\b(de|het|een|van|en|in|op|te|voor|is|dat|die|aan|met|als|niet|maar)\b/gi,
      tr: /\b(bir|ve|bu|için|de|da|ile|olan|var|ise|ne|gibi|mi|daha|çok|kadar)\b/gi,
    };

    let maxMatches = 0;
    let detectedLanguage = "en";

    Object.entries(patterns).forEach(([lang, pattern]) => {
      const matches = cleanText.match(pattern);
      const matchCount = matches ? matches.length : 0;
      if (matchCount > maxMatches) {
        maxMatches = matchCount;
        detectedLanguage = lang;
      }
    });

    return maxMatches >= 2 ? detectedLanguage : "en";
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    if (!videoId || videoId === "1" || videoId === "undefined") {
      alert("Cannot post comment: Invalid video. Please refresh the page.");
      return;
    }

    if (!validateComment(newComment)) {
      alert(
        "Comment contains dangerous content or is too long (max 1000 characters)."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const detectedLanguage = detectLanguage(newComment);
      console.log("🌍 Detected language:", detectedLanguage);

      const commentData = {
        text: newComment.trim(),
        commentbody: newComment.trim(),
        videoid: videoId,
        userid: user._id,
        usercommented: user.name || "Anonymous",
        originalText: newComment.trim(),
        originalLanguage: detectedLanguage,
        location: userLocation || {
          city: "Unknown",
          country: "Unknown",
          countryCode: "XX",
        },
      };

      console.log("📤 Posting comment:", commentData);
      const res = await axiosInstance.post("/comment/postcomment", commentData);
      console.log("✅ Comment posted:", res.data);

      if (res.data.comment === true && res.data.data) {
        const savedComment = res.data.data;

        const newCommentObj: Comment = {
          _id: savedComment._id,
          videoid: videoId,
          userid: user._id,
          commentbody: newComment.trim(),
          usercommented: user.name || "Anonymous",
          commentedon: savedComment.commentedon || new Date().toISOString(),
          originalText: newComment.trim(),
          originalLanguage: detectedLanguage,
          location: userLocation || {
            city: "Unknown",
            country: "Unknown",
            countryCode: "XX",
          },
          likes: 0,
          dislikes: 0,
          userVote: null,
          translations: [],
          currentTranslation: null,
          isHidden: false,
        };

        setComments([newCommentObj, ...comments]);
        setNewComment("");

        console.log("✅ Comment added to UI successfully");
      } else {
        throw new Error(res.data.message || "Invalid response from server");
      }
    } catch (error: any) {
      console.error("❌ Error adding comment:", error);

      let errorMessage = "Failed to post comment. ";

      if (error.code === "ECONNABORTED") {
        errorMessage += "Request timeout. Please check your connection.";
      } else if (error.response?.status === 500) {
        errorMessage += "Server error. Please try again.";
        console.error("🔥 Backend returned:", error.response?.data);
      } else if (error.response?.status === 400) {
        errorMessage += error.response.data?.message || "Invalid comment data.";
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (!navigator.onLine) {
        errorMessage += "No internet connection.";
      } else {
        errorMessage += "Please try again.";
      }

      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (
    commentId: string,
    voteType: "like" | "dislike"
  ) => {
    if (!user) {
      alert("Please login to vote");
      return;
    }

    try {
      console.log(`🗳️ Voting ${voteType} on comment:`, commentId);

      setComments((prev) =>
        prev.map((comment) => {
          if (comment._id === commentId) {
            const currentVote = comment.userVote;
            let newLikes = comment.likes || 0;
            let newDislikes = comment.dislikes || 0;
            let newUserVote: "like" | "dislike" | null = voteType;

            if (currentVote === "like") newLikes--;
            if (currentVote === "dislike") newDislikes--;

            if (currentVote === voteType) {
              newUserVote = null;
            } else {
              if (voteType === "like") newLikes++;
              if (voteType === "dislike") newDislikes++;
            }

            return {
              ...comment,
              likes: newLikes,
              dislikes: newDislikes,
              userVote: newUserVote,
            };
          }
          return comment;
        })
      );

      const response = await axiosInstance.post(`/comment/vote/${commentId}`, {
        voteType,
        userId: user._id,
      });

      console.log("✅ Vote response:", response.data);

      if (response.data.autoHidden) {
        console.log("🚫 Comment auto-hidden due to dislikes");
        setComments((prev) => prev.filter((c) => c._id !== commentId));
        alert("Comment has been hidden due to community feedback");
      }
    } catch (error: any) {
      console.error("❌ Error voting:", error);
      loadComments();
    }
  };

  // ============================================================================
  // PROFESSIONAL REPORT SYSTEM
  // ============================================================================

  const openReportDialog = (commentId: string) => {
    if (!user) {
      alert("Please login to report comments");
      return;
    }
    setReportingCommentId(commentId);
    setShowReportDialog(true);
    setSelectedCategory(null);
    setReportDetails("");
    setReportSuccess(false);
    setReportError("");
  };

  const closeReportDialog = () => {
    setShowReportDialog(false);
    setReportingCommentId(null);
    setSelectedCategory(null);
    setReportDetails("");
    setReportSuccess(false);
    setReportError("");
  };

  const handleSubmitReport = async () => {
    if (!selectedCategory) {
      setReportError("Please select a reason for reporting");
      return;
    }

    if (!reportingCommentId) return;

    setIsSubmittingReport(true);
    setReportError("");

    try {
      const reportData = {
        targetType: "comment",
        targetId: reportingCommentId,
        category: selectedCategory,
        reason:
          REPORT_CATEGORIES.find((c) => c.id === selectedCategory)?.label ||
          selectedCategory,
        description: reportDetails.trim(),
      };

      console.log("📤 Submitting report:", reportData);

      const response = await axiosInstance.post("/report/submit", reportData);

      if (response.data.success) {
        console.log("✅ Report submitted successfully");
        setReportSuccess(true);

        setTimeout(() => {
          closeReportDialog();
        }, 2000);
      }
    } catch (err: any) {
      console.error("❌ Report submission error:", err);

      if (err.response?.status === 401) {
        setReportError("Please login to report content");
      } else if (err.response?.status === 400) {
        const message = err.response.data?.message || "Invalid request";
        if (
          message.toLowerCase().includes("already reported") ||
          message.toLowerCase().includes("recently")
        ) {
          setReportError(
            "You have already reported this comment. You can only report the same content once every 24 hours."
          );
        } else {
          setReportError(message);
        }
      } else if (err.response?.status === 404) {
        setReportError("Comment not found or has been deleted");
      } else {
        setReportError("Failed to submit report. Please try again later.");
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case "high":
        return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "medium":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      default:
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    }
  };

  // ============================================================================
  // TRANSLATION FUNCTIONS
  // ============================================================================

  const handleTranslate = async (commentId: string, targetLanguage: string) => {
    console.log("\n🌐 ===== TRANSLATION REQUEST =====");
    console.log("   Comment ID:", commentId);
    console.log("   Target Language:", targetLanguage);

    setTranslationLoading(commentId);
    setShowTranslationOptions(null);

    try {
      const comment = comments.find((c) => c._id === commentId);
      if (!comment) {
        throw new Error("Comment not found");
      }

      const commentTranslations = Array.isArray(comment.translations)
        ? comment.translations
        : [];

      const cachedTranslation = commentTranslations.find(
        (t) => t.language === targetLanguage
      );

      if (cachedTranslation) {
        console.log("⚡ Using cached translation:", cachedTranslation.text);
        setComments((prev) =>
          prev.map((c) =>
            c._id === commentId
              ? {
                  ...c,
                  currentTranslation: {
                    text: cachedTranslation.text,
                    language: targetLanguage,
                  },
                }
              : c
          )
        );
        setTranslationLoading(null);
        return;
      }

      console.log("📤 Requesting new translation from API");

      const response = await axiosInstance.post(
        `/translate/comment/${commentId}`,
        { targetLanguage },
        {
          timeout: 20000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📥 Translation response:", response.data);

      if (response.data.success) {
        setComments((prev) =>
          prev.map((c) => {
            if (c._id === commentId) {
              const currentTranslations = Array.isArray(c.translations)
                ? c.translations
                : [];

              const newTranslations = [...currentTranslations];

              if (!response.data.fromCache) {
                newTranslations.push({
                  language: targetLanguage,
                  text: response.data.translatedText,
                  translatedAt: new Date().toISOString(),
                });
              }

              return {
                ...c,
                translations: newTranslations,
                currentTranslation: {
                  text: response.data.translatedText,
                  language: targetLanguage,
                },
              };
            }
            return c;
          })
        );

        const cacheStatus = response.data.fromCache
          ? "⚡ from cache"
          : "🆕 newly translated";
        console.log(`✅ Translation successful (${cacheStatus})`);
      } else {
        throw new Error(response.data.message || "Translation failed");
      }
    } catch (error: any) {
      console.error("\n❌ ===== TRANSLATION ERROR =====");
      console.error("   Error:", error.message);
      console.error("   Response:", error.response?.data);

      let errorMessage = "Translation failed. ";

      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        errorMessage += "Request timed out. Please try again.";
      } else if (error.response?.status === 404) {
        errorMessage += "Translation service not found.";
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else {
        errorMessage += "Please try again.";
      }

      alert(errorMessage);
    } finally {
      setTranslationLoading(null);
    }
  };

  const showOriginal = (commentId: string) => {
    console.log("🔄 Showing original comment:", commentId);
    setComments((prev) =>
      prev.map((c) =>
        c._id === commentId ? { ...c, currentTranslation: null } : c
      )
    );
  };

  const getDisplayText = (comment: Comment): string => {
    return comment.currentTranslation?.text || comment.commentbody;
  };

  const getLanguageName = (langCode: string): string => {
    const language = SUPPORTED_LANGUAGES.find((lang) => lang.code === langCode);
    return language ? language.name : langCode.toUpperCase();
  };

  const getCountryFlag = (countryCode: string): string => {
    if (countryCode === "XX" || countryCode.length !== 2) return "🌍";
    try {
      const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return "🌍";
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;

    if (!validateComment(editText)) {
      alert(
        "Comment contains dangerous content or is too long (max 1000 characters)."
      );
      return;
    }

    try {
      console.log("📝 Updating comment:", editingCommentId);
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText }
      );

      if (res.data) {
        console.log("✅ Comment updated");
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error) {
      console.error("❌ Error updating comment:", error);
      alert("Failed to update comment");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      console.log("🗑️ Deleting comment:", id);
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);

      if (res.data.comment) {
        console.log("✅ Comment deleted");
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.error("❌ Error deleting comment:", error);
      alert("Failed to delete comment");
    }
  };

  if (!videoId || videoId === "1" || videoId === "undefined") {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">Comments are not available for this video.</p>
        <p className="text-xs mt-2">
          Please select a valid video to view comments.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Report Dialog */}
      <Dialog
        open={showReportDialog}
        onOpenChange={(open) => !open && closeReportDialog()}
      >
        <DialogContent
          className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800 text-white"
          onInteractOutside={(e) => e.preventDefault()}
        >
          {reportSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Report Submitted</h3>
              <p className="text-gray-400 text-center text-sm">
                Thank you for helping us keep the community safe. Our team will
                review this report.
              </p>
            </div>
          ) : (
            <>
              <DialogHeader className="relative">
                <div className="flex items-center gap-3 pr-8">
                  <div className="bg-blue-500/10 p-2 rounded-lg">
                    <Flag className="w-5 h-5 text-blue-500" />
                  </div>
                  <DialogTitle className="text-xl">Report Comment</DialogTitle>
                </div>
                <DialogDescription className="text-gray-400 mt-2">
                  Help us understand what's wrong with this comment
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  {REPORT_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        selectedCategory === category.id
                          ? "bg-blue-500/20 border-blue-500"
                          : "bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 ${
                            selectedCategory === category.id
                              ? "text-blue-500"
                              : "text-gray-400"
                          }`}
                        >
                          {category.severity === "critical" && (
                            <AlertTriangle className="w-5 h-5" />
                          )}
                          {category.severity !== "critical" && (
                            <Flag className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {category.label}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {category.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Additional details (optional)
                  </label>
                  <Textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide more context about why you're reporting this comment..."
                    className="min-h-[100px] bg-gray-800 border-gray-700 text-white resize-none"
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-400 mt-1 text-right">
                    {reportDetails.length}/500
                  </div>
                </div>

                {reportError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-red-400 text-sm font-medium">
                          {reportError}
                        </p>
                        {reportError.includes("already reported") && (
                          <p className="text-red-300/70 text-xs mt-1">
                            You can only report the same content once every 24
                            hours.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={closeReportDialog}
                    variant="ghost"
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white"
                    disabled={isSubmittingReport}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitReport}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!selectedCategory || isSubmittingReport}
                  >
                    {isSubmittingReport ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Report"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Comments Section */}
      <div className="space-y-4 px-3 md:px-0" id="comments-section">
        <h2 className="text-lg md:text-xl font-semibold text-youtube-primary">
          {comments.length} Comments
        </h2>

        {/* Add Comment Box */}
        {user && (
          <div className="flex gap-3">
            <Avatar className="w-9 h-9 md:w-10 md:h-10 flex-shrink-0">
              <AvatarImage
                src={getUserAvatar({
                  avatar: user.avatar,
                  image: user.image,
                })}
                alt={user.name || "User"}
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_AVATAR_SVG;
                }}
              />
              <AvatarFallback className="bg-youtube-hover text-youtube-primary">
                {user.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e: any) => setNewComment(e.target.value)}
                className="min-h-[60px] md:min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0 text-sm md:text-base bg-transparent"
                maxLength={1000}
                style={{ fontSize: "16px" }}
              />
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="text-xs text-youtube-secondary flex items-center gap-2 flex-wrap">
                  <span>{newComment.length}/1000</span>
                  {userLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="hidden sm:inline">
                        {userLocation.city}, {userLocation.country}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewComment("")}
                    disabled={!newComment.trim() || isSubmitting}
                    className="text-xs md:text-sm h-8 md:h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm h-8 md:h-9"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      "Comment"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
              <p className="text-sm text-youtube-secondary">
                Loading comments...
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-youtube-secondary">
                No comments yet. Be the first to comment!
              </p>
            </div>
          ) : (
            comments.map((comment) => {
              const { avatar, name, userId } = getCommentUserData(comment);

              return (
                <div key={comment._id} className="flex gap-3">
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarImage
                      src={avatar}
                      alt={name}
                      onError={(e) => {
                        console.warn("❌ Avatar load failed:", avatar);
                        e.currentTarget.src = DEFAULT_AVATAR_SVG;
                      }}
                    />
                    <AvatarFallback className="bg-youtube-hover text-youtube-primary text-sm">
                      {name[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    {/* Comment Header */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-sm text-youtube-primary">
                        {name}
                      </span>

                      {comment.location &&
                        comment.location.city !== "Unknown" && (
                          <div className="flex items-center gap-1 text-xs text-youtube-secondary">
                            <span>
                              {getCountryFlag(comment.location.countryCode)}
                            </span>
                            <MapPin className="w-3 h-3" />
                            <span className="hidden sm:inline">
                              {comment.location.city},{" "}
                              {comment.location.country}
                            </span>
                          </div>
                        )}

                      <span className="text-xs text-youtube-secondary">
                        {formatDistanceToNow(new Date(comment.commentedon))} ago
                      </span>
                    </div>

                    {editingCommentId === comment._id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          maxLength={1000}
                          className="min-h-[60px] text-sm"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={handleUpdateComment}
                            disabled={!editText.trim()}
                            className="h-8 text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditText("");
                            }}
                            className="h-8 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Comment Body */}
                        <div className="mb-2">
                          <p className="text-sm text-youtube-primary whitespace-pre-wrap break-words select-text cursor-text">
                            {getDisplayText(comment)}
                          </p>

                          {/* Translation Badge */}
                          {comment.currentTranslation && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap select-none">
                              <span className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded select-none">
                                Translated from{" "}
                                {getLanguageName(
                                  comment.originalLanguage || "en"
                                )}{" "}
                                to{" "}
                                {getLanguageName(
                                  comment.currentTranslation.language
                                )}
                              </span>
                              <button
                                onClick={() => showOriginal(comment._id)}
                                className="text-xs text-blue-600 hover:underline select-none"
                              >
                                Show original
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Comment Actions */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Like/Dislike */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleVote(comment._id, "like")}
                              className={`flex items-center gap-1 px-2 py-1 rounded-full hover:bg-youtube-hover transition-colors ${
                                comment.userVote === "like"
                                  ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20"
                                  : "text-youtube-primary"
                              }`}
                              disabled={!user}
                              title={!user ? "Login to vote" : "Like"}
                            >
                              <ThumbsUp className="w-4 h-4" />
                              <span className="text-xs font-medium">
                                {comment.likes || 0}
                              </span>
                            </button>

                            <button
                              onClick={() => handleVote(comment._id, "dislike")}
                              className={`flex items-center gap-1 px-2 py-1 rounded-full hover:bg-youtube-hover transition-colors ${
                                comment.userVote === "dislike"
                                  ? "text-red-600 bg-red-50 dark:bg-red-900/20"
                                  : "text-youtube-primary"
                              }`}
                              disabled={!user}
                              title={!user ? "Login to vote" : "Dislike"}
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Translate */}
                          <DropdownMenu
                            open={showTranslationOptions === comment._id}
                            onOpenChange={(open) =>
                              setShowTranslationOptions(
                                open ? comment._id : null
                              )
                            }
                          >
                            <DropdownMenuTrigger asChild>
                              <button
                                className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-youtube-hover text-youtube-primary transition-colors text-xs"
                                disabled={translationLoading === comment._id}
                              >
                                {translationLoading === comment._id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Translating...</span>
                                  </>
                                ) : (
                                  <>
                                    <Languages className="w-4 h-4" />
                                    <span>Translate</span>
                                  </>
                                )}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-48 max-h-64 overflow-y-auto">
                              <div className="px-2 py-1 text-sm font-medium text-youtube-secondary sticky top-0 bg-youtube-primary">
                                Translate to:
                              </div>
                              {SUPPORTED_LANGUAGES.filter(
                                (lang) =>
                                  lang.code !==
                                  (comment.originalLanguage || "en")
                              ).map((lang) => (
                                <DropdownMenuItem
                                  key={lang.code}
                                  onClick={() =>
                                    handleTranslate(comment._id, lang.code)
                                  }
                                  disabled={translationLoading === comment._id}
                                  className="cursor-pointer"
                                >
                                  <Globe className="w-4 h-4 mr-2" />
                                  {lang.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Report Button */}
                          <button
                            onClick={() => openReportDialog(comment._id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-red-500/10 text-youtube-primary hover:text-red-500 transition-colors text-xs"
                            disabled={!user}
                            title={!user ? "Login to report" : "Report"}
                          >
                            <Flag className="w-4 h-4" />
                            <span>Report</span>
                          </button>

                          {/* Edit/Delete Menu (Owner Only) */}
                          {userId === user?._id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-youtube-hover text-youtube-primary transition-colors">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={() => handleEdit(comment)}
                                  className="cursor-pointer"
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(comment._id)}
                                  className="text-red-600 cursor-pointer"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default Comments;
