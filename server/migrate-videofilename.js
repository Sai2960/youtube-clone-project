// migrate-videofilename.js - Fix missing videofilename field in existing videos
import mongoose from "mongoose";
import videofiles from "./Modals/video.js";
import dotenv from "dotenv";

dotenv.config();

const DBURL = process.env.DB_URL;

const migrateVideoFilenames = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(DBURL, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ Connected to MongoDB for migration");

    // Find all videos
    const videos = await videofiles.find({});
    console.log(`\n📊 Found ${videos.length} videos to check\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const video of videos) {
      try {
        let needsUpdate = false;
        const updates = {};

        // Check if videofilename is missing
        if (!video.videofilename) {
          if (video.filepath) {
            // Extract filename from filepath
            const pathParts = video.filepath.split(/[\\\/]/);
            const extractedFilename = pathParts[pathParts.length - 1];
            updates.videofilename = extractedFilename;
            needsUpdate = true;
            console.log(`📝 Video: "${video.videotitle}"`);
            console.log(`   Missing videofilename, extracted: ${extractedFilename}`);
          } else if (video.filename) {
            // Use filename field as fallback
            updates.videofilename = video.filename;
            needsUpdate = true;
            console.log(`📝 Video: "${video.videotitle}"`);
            console.log(`   Using filename field: ${video.filename}`);
          } else {
            console.log(`⚠️  Video: "${video.videotitle}" - No source for videofilename`);
            errorCount++;
            continue;
          }
        } else {
          skippedCount++;
          continue;
        }

        // Update the video
        if (needsUpdate) {
          await videofiles.findByIdAndUpdate(video._id, { $set: updates });
          updatedCount++;
          console.log(`   ✅ Updated successfully\n`);
        }

      } catch (error) {
        console.error(`❌ Error processing video "${video.videotitle}":`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(50));
    console.log(`✅ Updated:  ${updatedCount} videos`);
    console.log(`⏭️  Skipped:  ${skippedCount} videos (already have videofilename)`);
    console.log(`❌ Errors:   ${errorCount} videos`);
    console.log(`📁 Total:    ${videos.length} videos`);
    console.log("=".repeat(50) + "\n");

    if (updatedCount > 0) {
      console.log("✅ Migration completed successfully!");
    } else {
      console.log("ℹ️  No updates needed - all videos already have videofilename");
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run migration
migrateVideoFilenames();