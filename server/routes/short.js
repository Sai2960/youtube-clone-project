// server/routes/short.js - COMPLETE WORKING VERSION

import express from "express";
import multer from "multer";
import { cloudinary } from "../config/cloudinary.js";
import * as shortController from "../controllers/shortController.js";
import { verifyToken } from "../middleware/auth.js";
import Comment from "../Modals/comment.js";
import Short from "../Modals/short.js";
import { translateComment } from "../controllers/translation.js";
import {
  supabase,
  isSupabaseConfigured,
  bucketName,
} from "../config/supabase.js";

const router = express.Router();

console.log("✅ Shorts routes loading...");

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

router.get("/", shortController.getAllShorts);
router.get("/channel/:userId", shortController.getShortsByChannel);
router.get("/:id", shortController.getShortById);
router.get("/:id/comments", shortController.getComments);
router.post("/:id/share", shortController.shareShort);
router.post("/:id/view", shortController.incrementView);

// ============================================================================
// UPLOAD ROUTE - FIXED VERSION
// ============================================================================

router.post(
  "/upload",
  verifyToken,
  (req, res, next) => {
    console.log("\n📤 ===== SHORTS UPLOAD REQUEST =====");
    console.log("User:", req.user?.name);
    console.log("User ID:", req.user?._id);
    console.log(
      "Storage:",
      isSupabaseConfigured() ? "Supabase" : "Cloudinary (fallback)"
    );

    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 2,
      },
    }).fields([
      { name: "video", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]);

    upload(req, res, async (err) => {
      if (err) {
        console.error("❌ Multer error:", err);
        return res.status(400).json({
          success: false,
          message: `File upload error: ${err.message}`,
          code: "MULTER_ERROR",
        });
      }

      console.log("📦 Files received:");
      console.log(
        "   Video:",
        req.files?.video?.[0]
          ? `${req.files.video[0].originalname} (${(
              req.files.video[0].size /
              1024 /
              1024
            ).toFixed(2)}MB)`
          : "MISSING"
      );
      console.log(
        "   Thumbnail:",
        req.files?.thumbnail?.[0]
          ? `${req.files.thumbnail[0].originalname} (${(
              req.files.thumbnail[0].size /
              1024 /
              1024
            ).toFixed(2)}MB)`
          : "MISSING"
      );

      if (!req.files || !req.files.video || !req.files.thumbnail) {
        console.error("❌ Missing files");
        return res.status(400).json({
          success: false,
          message: "Both video and thumbnail files are required",
          received: {
            video: !!req.files?.video,
            thumbnail: !!req.files?.thumbnail,
          },
        });
      }

      console.log("✅ Files validated, uploading...");

      try {
        const videoFile = req.files.video[0];
        const thumbnailFile = req.files.thumbnail[0];

        // ✅ TRY SUPABASE FIRST, FALLBACK TO CLOUDINARY
        if (isSupabaseConfigured()) {
          console.log("📤 Uploading to Supabase...");

          // Generate unique filenames
          const videoFilename = `shorts/videos/${Date.now()}-${
            videoFile.originalname
          }`;
          const thumbnailFilename = `shorts/thumbnails/${Date.now()}-${
            thumbnailFile.originalname
          }`;

          // Upload video to Supabase
          const { data: videoData, error: videoError } = await supabase.storage
            .from(bucketName)
            .upload(videoFilename, videoFile.buffer, {
              contentType: videoFile.mimetype,
              cacheControl: "3600",
              upsert: false,
            });

          if (videoError) {
            console.error("❌ Supabase video upload error:", videoError);
            throw new Error(`Video upload failed: ${videoError.message}`);
          }

          // Upload thumbnail to Supabase
          const { data: thumbnailData, error: thumbnailError } =
            await supabase.storage
              .from(bucketName)
              .upload(thumbnailFilename, thumbnailFile.buffer, {
                contentType: thumbnailFile.mimetype,
                cacheControl: "3600",
                upsert: false,
              });

          if (thumbnailError) {
            console.error(
              "❌ Supabase thumbnail upload error:",
              thumbnailError
            );
            throw new Error(
              `Thumbnail upload failed: ${thumbnailError.message}`
            );
          }

          // Get public URLs
          const { data: videoUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(videoFilename);

          const { data: thumbnailUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(thumbnailFilename);

          const videoUrl = videoUrlData.publicUrl;
          const thumbnailUrl = thumbnailUrlData.publicUrl;

          console.log("✅ Supabase upload complete");
          console.log("   Video:", videoUrl.substring(0, 80));
          console.log("   Thumbnail:", thumbnailUrl.substring(0, 80));

          // Attach URLs for controller
          req.files.video[0].path = videoUrl;
          req.files.video[0].filename = videoFilename;
          req.files.thumbnail[0].path = thumbnailUrl;
          req.files.thumbnail[0].filename = thumbnailFilename;

          next();
        } else {
          // ✅ FALLBACK TO CLOUDINARY
          console.log("⚠️  Supabase not configured, using Cloudinary...");

          if (
            !process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET
          ) {
            console.error("❌ Cloudinary not configured!");
            return res.status(500).json({
              success: false,
              message:
                "Server configuration error: No storage service available",
            });
          }

          console.log("📤 Uploading video to Cloudinary...");

          const videoUploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "youtube-clone/shorts/videos",
                resource_type: "video",
                format: "mp4",
                chunk_size: 6000000,
                timeout: 120000,
                transformation: [
                  {
                    video_codec: "auto",
                    audio_codec: "aac",
                    audio_frequency: 44100,
                    quality: "auto",
                  },
                ],
              },
              (error, result) => {
                if (error) {
                  console.error("❌ Video upload error:", error);
                  reject(error);
                } else {
                  console.log(
                    "✅ Video uploaded:",
                    result.secure_url.substring(0, 80)
                  );
                  resolve(result);
                }
              }
            );
            uploadStream.end(videoFile.buffer);
          });

          console.log("📤 Uploading thumbnail to Cloudinary...");

          const thumbnailUploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "youtube-clone/shorts/thumbnails",
                resource_type: "image",
                format: "jpg",
                timeout: 60000,
                transformation: [
                  {
                    width: 720,
                    height: 1280,
                    crop: "fill",
                    quality: "auto",
                  },
                ],
              },
              (error, result) => {
                if (error) {
                  console.error("❌ Thumbnail upload error:", error);
                  reject(error);
                } else {
                  console.log(
                    "✅ Thumbnail uploaded:",
                    result.secure_url.substring(0, 80)
                  );
                  resolve(result);
                }
              }
            );
            uploadStream.end(thumbnailFile.buffer);
          });

          const [videoResult, thumbnailResult] = await Promise.all([
            videoUploadPromise,
            thumbnailUploadPromise,
          ]);

          console.log("✅ Both uploads complete");

          req.files.video[0].path = videoResult.secure_url;
          req.files.video[0].filename = videoResult.public_id;
          req.files.thumbnail[0].path = thumbnailResult.secure_url;
          req.files.thumbnail[0].filename = thumbnailResult.public_id;

          next();
        }
      } catch (uploadError) {
        console.error("❌ Upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: `Upload failed: ${uploadError.message}`,
          code: "UPLOAD_ERROR",
          details:
            process.env.NODE_ENV === "development" ? uploadError : undefined,
        });
      }
    });
  },
  shortController.uploadShort
);
// ============================================================================
// OTHER PROTECTED ROUTES
// ============================================================================

router.post("/:id/like", verifyToken, shortController.likeShort);
router.post("/:id/dislike", verifyToken, shortController.dislikeShort);
router.post("/:id/comment", verifyToken, shortController.addComment);
router.post(
  "/channel/:channelId/subscribe",
  verifyToken,
  shortController.subscribeToChannel
);
router.delete("/:id", verifyToken, shortController.deleteShort);

// ============================================================================
// COMMENT ROUTES (keeping your existing code)
// ============================================================================

router.post(
  "/:shortId/comments/:commentId/like",
  verifyToken,
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user?._id || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Comment not found",
        });
      }

      if (!Array.isArray(comment.votes)) {
        comment.votes = [];
      }

      const voteIndex = comment.votes.findIndex(
        (v) => v.userId?.toString() === userId.toString()
      );

      let hasLiked = false;

      if (voteIndex !== -1) {
        const vote = comment.votes[voteIndex];

        if (vote.type === "like" || vote.voteType === "like") {
          comment.votes.splice(voteIndex, 1);
          hasLiked = false;
        } else {
          comment.votes[voteIndex] = {
            userId,
            type: "like",
            voteType: "like",
            createdAt: new Date(),
          };
          hasLiked = true;
        }
      } else {
        comment.votes.push({
          userId,
          type: "like",
          voteType: "like",
          createdAt: new Date(),
        });
        hasLiked = true;
      }

      const likes = comment.votes.filter(
        (v) => v.type === "like" || v.voteType === "like"
      ).length;
      const dislikes = comment.votes.filter(
        (v) => v.type === "dislike" || v.voteType === "dislike"
      ).length;

      comment.likesCount = likes;
      comment.dislikes = dislikes;
      comment.dislikesCount = dislikes;

      comment.markModified("votes");
      comment.markModified("likesCount");
      comment.markModified("dislikesCount");

      await comment.save();

      return res.status(200).json({
        success: true,
        message: hasLiked ? "Liked" : "Like removed",
        data: {
          likesCount: likes,
          dislikesCount: dislikes,
          hasLiked,
          hasDisliked: false,
        },
      });
    } catch (error) {
      console.error("❌ Like error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to like comment",
        error: error.message,
      });
    }
  }
);

router.post(
  "/:shortId/comments/:commentId/dislike",
  verifyToken,
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user?._id || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Comment not found",
        });
      }

      if (!Array.isArray(comment.votes)) {
        comment.votes = [];
      }

      const voteIndex = comment.votes.findIndex(
        (v) => v.userId?.toString() === userId.toString()
      );

      let hasDisliked = false;

      if (voteIndex !== -1) {
        const vote = comment.votes[voteIndex];

        if (vote.type === "dislike" || vote.voteType === "dislike") {
          comment.votes.splice(voteIndex, 1);
          hasDisliked = false;
        } else {
          comment.votes[voteIndex] = {
            userId,
            type: "dislike",
            voteType: "dislike",
            createdAt: new Date(),
          };
          hasDisliked = true;
        }
      } else {
        comment.votes.push({
          userId,
          type: "dislike",
          voteType: "dislike",
          createdAt: new Date(),
        });
        hasDisliked = true;
      }

      const likes = comment.votes.filter(
        (v) => v.type === "like" || v.voteType === "like"
      ).length;
      const dislikes = comment.votes.filter(
        (v) => v.type === "dislike" || v.voteType === "dislike"
      ).length;

      comment.likesCount = likes;
      comment.dislikes = dislikes;
      comment.dislikesCount = dislikes;

      comment.markModified("votes");
      comment.markModified("likesCount");
      comment.markModified("dislikesCount");

      await comment.save();

      return res.status(200).json({
        success: true,
        message: hasDisliked ? "Disliked" : "Dislike removed",
        data: {
          likesCount: likes,
          dislikesCount: dislikes,
          hasLiked: false,
          hasDisliked,
        },
      });
    } catch (error) {
      console.error("❌ Dislike error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to dislike comment",
        error: error.message,
      });
    }
  }
);

router.delete(
  "/:shortId/comments/:commentId",
  verifyToken,
  async (req, res) => {
    try {
      const { shortId, commentId } = req.params;
      const userId = req.user?._id || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Comment not found",
        });
      }

      const short = await Short.findById(shortId);
      if (!short) {
        return res.status(404).json({
          success: false,
          message: "Short not found",
        });
      }

      const commentUserId = comment.userId || comment.userid;
      const isOwner = commentUserId?.toString() === userId.toString();
      const isShortOwner = short.userId?.toString() === userId.toString();

      if (!isOwner && !isShortOwner) {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      if (Array.isArray(short.comments)) {
        short.comments = short.comments.filter(
          (id) => id.toString() !== commentId
        );
        short.commentsCount = short.comments.length;
        await short.save();
      }

      await Comment.findByIdAndDelete(commentId);

      return res.status(200).json({
        success: true,
        message: "Comment deleted",
      });
    } catch (error) {
      console.error("❌ Delete error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to delete comment",
        error: error.message,
      });
    }
  }
);

router.post(
  "/:shortId/comments/:commentId/report",
  verifyToken,
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const { reason, details } = req.body;
      const userId = req.user?._id || req.user?.id;

      if (!userId || !reason) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Comment not found",
        });
      }

      if (Array.isArray(comment.reports)) {
        const alreadyReported = comment.reports.some(
          (r) => r.userId?.toString() === userId.toString()
        );

        if (alreadyReported) {
          return res.status(400).json({
            success: false,
            message: "Already reported",
          });
        }
      }

      comment.isReported = true;
      comment.reportCount = (comment.reportCount || 0) + 1;

      if (!Array.isArray(comment.reports)) {
        comment.reports = [];
      }

      comment.reports.push({
        userId,
        reason,
        details: details || "",
        reportedAt: new Date(),
      });

      if (comment.reportCount >= 5) {
        comment.isHidden = true;
      }

      await comment.save();

      return res.status(200).json({
        success: true,
        message: "Report submitted",
      });
    } catch (error) {
      console.error("❌ Report error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to report comment",
        error: error.message,
      });
    }
  }
);

router.post(
  "/:shortId/comments/:commentId/translate",
  verifyToken,
  async (req, res) => {
    try {
      req.params.id = req.params.commentId;
      await translateComment(req, res);
    } catch (error) {
      console.error("❌ Translation error:", error);
      res.status(500).json({
        success: false,
        message: "Translation failed",
        error: error.message,
      });
    }
  }
);

console.log("✅ Shorts routes loaded successfully");

// ✅ ADMIN: Fix all existing shorts URLs
router.post("/admin/fix-all-shorts", async (req, res) => {
  try {
    console.log("\n🔧 ===== FIXING ALL SHORTS URLS =====");

    const shorts = await Short.find({});

    let fixed = 0;
    let alreadyGood = 0;
    let unfixable = 0;
    const results = [];

    for (const short of shorts) {
      const isCloudinary = (url) =>
        url && url.includes("cloudinary.com") && url.startsWith("https://");

      // Check if already good
      if (isCloudinary(short.videoUrl) && isCloudinary(short.thumbnailUrl)) {
        alreadyGood++;
        continue;
      }

      // Try to fix
      let videoFixed = false;
      let thumbnailFixed = false;

      // Video URL
      if (!isCloudinary(short.videoUrl)) {
        if (short.videoUrl && short.videoUrl.includes("cloudinary.com")) {
          // Has cloudinary but wrong protocol
          short.videoUrl = short.videoUrl.replace("http://", "https://");
          videoFixed = true;
        } else {
          console.error(`❌ Cannot fix video for short ${short._id}`);
          unfixable++;
          continue;
        }
      }

      // Thumbnail URL
      if (!isCloudinary(short.thumbnailUrl)) {
        if (
          short.thumbnailUrl &&
          short.thumbnailUrl.includes("cloudinary.com")
        ) {
          short.thumbnailUrl = short.thumbnailUrl.replace(
            "http://",
            "https://"
          );
          thumbnailFixed = true;
        } else {
          console.error(`❌ Cannot fix thumbnail for short ${short._id}`);
        }
      }

      if (videoFixed || thumbnailFixed) {
        await short.save();
        fixed++;
        results.push({
          id: short._id,
          title: short.title,
          videoUrl: short.videoUrl.substring(0, 60),
          thumbnailUrl: short.thumbnailUrl.substring(0, 60),
        });
        console.log(`✅ Fixed: ${short.title}`);
      }
    }

    console.log(
      `\n✅ Fixed: ${fixed}, Already Good: ${alreadyGood}, Unfixable: ${unfixable}`
    );

    res.json({
      success: true,
      summary: {
        total: shorts.length,
        fixed,
        alreadyGood,
        unfixable,
      },
      results: results.slice(0, 10),
    });
  } catch (error) {
    console.error("❌ Fix error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ ADMIN: Check shorts status
router.get("/admin/check-shorts", async (req, res) => {
  try {
    const shorts = await Short.find({})
      .select("_id title videoUrl thumbnailUrl")
      .lean();

    const isCloudinary = (url) =>
      url && url.includes("cloudinary.com") && url.startsWith("https://");

    const analysis = shorts.map((s) => ({
      id: s._id,
      title: s.title,
      videoUrl: s.videoUrl?.substring(0, 60),
      thumbnailUrl: s.thumbnailUrl?.substring(0, 60),
      status: {
        video: isCloudinary(s.videoUrl) ? "✅" : "❌",
        thumbnail: isCloudinary(s.thumbnailUrl) ? "✅" : "❌",
      },
    }));

    const summary = {
      total: shorts.length,
      valid: analysis.filter(
        (s) => s.status.video === "✅" && s.status.thumbnail === "✅"
      ).length,
      invalid: analysis.filter(
        (s) => s.status.video === "❌" || s.status.thumbnail === "❌"
      ).length,
    };

    res.json({
      success: true,
      summary,
      shorts: analysis,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ Delete all shorts with local /uploads/ paths
router.post("/admin/delete-local-shorts", async (req, res) => {
  try {
    console.log("\n🗑️ ===== DELETING LOCAL-PATH SHORTS =====");

    const brokenShorts = await Short.find({
      $or: [
        { videoUrl: { $regex: "^/uploads/" } },
        { thumbnailUrl: { $regex: "^/uploads/" } },
        { videoUrl: { $not: { $regex: "cloudinary.com" } } },
      ],
    });

    console.log(`Found ${brokenShorts.length} broken shorts`);

    const deleted = [];
    for (const short of brokenShorts) {
      deleted.push({
        id: short._id,
        title: short.title,
        videoUrl: short.videoUrl?.substring(0, 60),
      });
      await Short.findByIdAndDelete(short._id);
    }

    console.log(`✅ Deleted ${deleted.length} shorts`);

    res.json({
      success: true,
      deleted: deleted.length,
      shorts: deleted,
    });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
