import mongoose from "mongoose";
import dotenv from "dotenv";
import videofiles from "../Modals/video.js";

dotenv.config();

async function fixVideoOwnership() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to MongoDB");

    const defaultUserId = process.env.DEFAULT_USER_ID || "default-user-id";

    // Update all videos that don't have uploadedBy set
    const result = await videofiles.updateMany(
      { uploadedBy: { $exists: false } },
      { $set: { uploadedBy: defaultUserId } }
    );

    console.log(`✅ Updated ${result.modifiedCount} videos`);
    
    // Verify
    const videos = await videofiles.find().select('videotitle uploadedBy');
    console.log("\nVideos after update:");
    videos.forEach(v => console.log(`- ${v.videotitle}: ${v.uploadedBy}`));
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixVideoOwnership();