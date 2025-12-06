import mongoose from "mongoose";

const downloadSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    videoTitle: {
      type: String,
      required: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    downloadUrl: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    quality: {
      type: String,
      enum: ['720p', '480p', '360p'],
      default: '480p',
    },
    downloadedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    expiresAt: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
    }
  },
  {
    timestamps: true,
  }
);

downloadSchema.index({ userId: 1, downloadedAt: -1 });
downloadSchema.index({ userId: 1, createdAt: 1 });
downloadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

downloadSchema.statics.getTodayDownloadCount = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await this.countDocuments({
    userId: userId,
    downloadedAt: {
      $gte: today,
      $lt: tomorrow
    }
  });
};

export default mongoose.model("download", downloadSchema);