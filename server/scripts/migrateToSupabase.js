// server/scripts/migrateToSupabase.js

import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Your MongoDB models
import videofiles from '../Modals/video.js';
import User from '../Modals/User.js';
import Short from '../Modals/short.js';

const SUPABASE_BUCKET = 'youtube-videos';

async function migrateVideos() {
  console.log('Starting video migration from Cloudinary to Supabase...');
  
  const videos = await videofiles.find({
    $or: [
      { filepath: { $regex: 'cloudinary.com' } },
      { videofile: { $regex: 'cloudinary.com' } },
      { videoLink: { $regex: 'cloudinary.com' } }
    ]
  });
  
  let successCount = 0;
  let failCount = 0;
  let alreadyMigrated = 0;

  console.log(`Found ${videos.length} videos with Cloudinary URLs`);

  for (const video of videos) {
    try {
      const videoUrl = video.filepath || video.videofile || video.videoLink;
      
      // Skip if already migrated to Supabase
      if (videoUrl && videoUrl.includes('supabase.co')) {
        console.log(`⏭️ Already migrated: ${video.videotitle}`);
        alreadyMigrated++;
        continue;
      }

      if (!videoUrl || !videoUrl.includes('cloudinary.com')) {
        console.log(`⚠️ No valid Cloudinary URL: ${video.videotitle}`);
        failCount++;
        continue;
      }

      console.log(`📥 Downloading: ${video.videotitle}`);
      
      // Download video from Cloudinary
      const response = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 600000, // 10 minutes for large files
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      const buffer = Buffer.from(response.data);
      const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      console.log(`   Size: ${fileSizeMB}MB`);
      
      // Generate filename
      const timestamp = Date.now();
      const fileName = `videos/${video._id}_${timestamp}.mp4`;
      
      console.log(`📤 Uploading to Supabase: ${fileName}`);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(fileName, buffer, {
          contentType: 'video/mp4',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error(`❌ Supabase upload error:`, error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(fileName);

      const newVideoUrl = urlData.publicUrl;
      console.log(`✅ New URL: ${newVideoUrl.substring(0, 80)}`);

      // Update ALL video URL fields
      video.filepath = newVideoUrl;
      video.videofile = newVideoUrl;
      video.videoLink = newVideoUrl;
      video.videoUrl = newVideoUrl;
      video.videofilename = fileName;
      
      // Migrate thumbnail if exists
      const thumbnailUrl = video.thumbnail || video.videothumbnail || video.videothumb;
      
      if (thumbnailUrl && thumbnailUrl.includes('cloudinary.com')) {
        try {
          console.log(`   📸 Migrating thumbnail...`);
          
          const thumbResponse = await axios.get(thumbnailUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
          });
          
          const thumbBuffer = Buffer.from(thumbResponse.data);
          const thumbFileName = `thumbnails/${video._id}_${timestamp}.jpg`;
          
          const { data: thumbData, error: thumbError } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(thumbFileName, thumbBuffer, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false
            });

          if (!thumbError) {
            const { data: thumbUrlData } = supabase.storage
              .from(SUPABASE_BUCKET)
              .getPublicUrl(thumbFileName);
            
            video.thumbnail = thumbUrlData.publicUrl;
            video.videothumbnail = thumbUrlData.publicUrl;
            video.thumbnailUrl = thumbUrlData.publicUrl;
            video.videothumb = thumbUrlData.publicUrl;
            
            console.log(`   ✅ Thumbnail migrated`);
          }
        } catch (thumbError) {
          console.warn(`   ⚠️ Thumbnail migration failed:`, thumbError.message);
        }
      }

      await video.save();
      successCount++;
      console.log(`✅ Migrated: ${video.videotitle}\n`);
      
    } catch (error) {
      failCount++;
      console.error(`❌ Failed to migrate video ${video._id}:`, error.message);
      console.error(`   Title: ${video.videotitle}\n`);
    }
  }

  console.log(`\n🎉 Video Migration Complete:`);
  console.log(`   Total: ${videos.length}`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Already Migrated: ${alreadyMigrated}`);
  console.log(`   Failed: ${failCount}`);
}

async function migrateUserAvatars() {
  console.log('\n\nStarting user avatar migration...');
  
  const users = await User.find({
    $or: [
      { image: { $regex: 'cloudinary.com' } },
      { bannerImage: { $regex: 'cloudinary.com' } }
    ]
  });
  
  let successCount = 0;
  let failCount = 0;

  console.log(`Found ${users.length} users with Cloudinary images`);

  for (const user of users) {
    try {
      // Migrate profile picture
      if (user.image && user.image.includes('cloudinary.com')) {
        console.log(`📸 Migrating avatar: ${user.channelname || user.name}`);
        
        const response = await axios.get(user.image, {
          responseType: 'arraybuffer',
          timeout: 60000
        });
        
        const buffer = Buffer.from(response.data);
        const fileName = `avatars/${user._id}_${Date.now()}.jpg`;
        
        const { data, error } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from(SUPABASE_BUCKET)
          .getPublicUrl(fileName);

        user.image = urlData.publicUrl;
      }

      // Migrate banner image
      if (user.bannerImage && user.bannerImage.includes('cloudinary.com')) {
        console.log(`   🖼️ Migrating banner...`);
        
        const response = await axios.get(user.bannerImage, {
          responseType: 'arraybuffer',
          timeout: 60000
        });
        
        const buffer = Buffer.from(response.data);
        const fileName = `banners/${user._id}_${Date.now()}.jpg`;
        
        const { data, error } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from(SUPABASE_BUCKET)
          .getPublicUrl(fileName);

        user.bannerImage = urlData.publicUrl;
      }

      await user.save();
      successCount++;
      console.log(`✅ Migrated: ${user.channelname || user.name}\n`);
      
    } catch (error) {
      failCount++;
      console.error(`❌ Failed to migrate user ${user._id}:`, error.message);
    }
  }

  console.log(`\n🎉 User Avatar Migration Complete:`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
}

async function main() {
  try {
    console.log('\n🚀 ===== MIGRATION STARTED =====\n');
    console.log('MongoDB URL:', process.env.MONGODB_URL?.substring(0, 30) + '...');
    console.log('Supabase URL:', process.env.SUPABASE_URL);
    console.log('Bucket:', SUPABASE_BUCKET);
    console.log('\n');

    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB\n');

    await migrateVideos();
    await migrateUserAvatars();

    console.log('\n\n🎉 ===== ALL MIGRATIONS COMPLETED =====');
  } catch (error) {
    console.error('\n❌ Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

main();