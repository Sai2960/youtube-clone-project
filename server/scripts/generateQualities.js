// server/scripts/generateQualities.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const videoSchema = new mongoose.Schema({}, { strict: false });
const Video = mongoose.model("videofiles", videoSchema);

async function generateQualities() {
  try {
    console.log("🔧 ===== GENERATING QUALITY URLS =====\n");
    await mongoose.connect(process.env.DB_URL);
    console.log("✅ Connected to MongoDB\n");

    const CLOUDINARY_CLOUD_NAME =
      process.env.CLOUDINARY_CLOUD_NAME || "dxuxxk0ss";
    const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload`;

    const videos = await Video.find({
      filepath: { $regex: "cloudinary.com" },
    });

    console.log(`📊 Found ${videos.length} videos\n`);

    let updated = 0;

    for (const video of videos) {
      const currentUrl = video.filepath;

      // Extract public_id
      const match = currentUrl.match(/youtube-clone\/videos\/[^/]+/);
      if (!match) {
        console.warn(
          `⚠️ Could not extract public_id from: ${video.videotitle}`
        );
        continue;
      }

      const publicId = match[0];

      // ✅ Generate ALL quality URLs
      const qualities = {
        mobile_low: `${baseUrl}/w_640,h_360,c_limit,q_auto:low,br_500k,vc_h264,ac_aac/${publicId}.mp4`,
        mobile: `${baseUrl}/w_854,h_480,c_limit,q_auto:good,br_1m,vc_h264,ac_aac/${publicId}.mp4`,
        sd: `${baseUrl}/w_1280,h_720,c_limit,q_auto:good,br_2500k,vc_h264,ac_aac/${publicId}.mp4`,
        hd: `${baseUrl}/w_1920,h_1080,c_limit,q_100,br_5m,vc_h264,ac_aac/${publicId}.mp4`,
        original: `${baseUrl}/q_100,vc_h264,ac_aac/${publicId}.mp4`,
      };

      // ✅ Generate thumbnail URLs
      const thumbnails = {
        small: `${baseUrl}/so_0,w_320,h_180,c_fill,q_auto:low/${publicId}.jpg`,
        medium: `${baseUrl}/so_0,w_640,h_360,c_fill,q_auto:good/${publicId}.jpg`,
        large: `${baseUrl}/so_0,w_1280,h_720,c_fill,q_100/${publicId}.jpg`,
      };

      // Update video with all qualities
      video.qualities = qualities;
      video.thumbnails = thumbnails;

      // Set default to mobile-friendly
      video.filepath = qualities.mobile;
      video.videofile = qualities.mobile;
      video.videoLink = qualities.mobile;
      video.videoUrl = qualities.mobile;

      video.thumbnail = thumbnails.medium;
      video.videothumbnail = thumbnails.medium;
      video.thumbnailUrl = thumbnails.medium;

      await video.save();

      updated++;
      console.log(`✅ Updated: ${video.videotitle}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 QUALITY GENERATION COMPLETE:");
    console.log("=".repeat(60));
    console.log(`✅ Updated: ${updated}`);
    console.log(`📊 Total: ${videos.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

generateQualities();
