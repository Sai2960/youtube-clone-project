// server/scripts/migrateToSupabase.js

const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Your MongoDB models
const Video = require('../Modals/video');
const User = require('../Modals/User');
const Short = require('../Modals/short');

async function migrateVideos() {
  console.log('Starting video migration...');
  
  const videos = await Video.find({});
  let successCount = 0;
  let failCount = 0;

  for (const video of videos) {
    try {
      // Download video from Cloudinary
      if (video.videoUrl && video.videoUrl.includes('cloudinary')) {
        console.log(`Migrating video: ${video.title}`);
        
        const response = await axios.get(video.videoUrl, {
          responseType: 'arraybuffer'
        });
        
        const buffer = Buffer.from(response.data);
        const fileName = `videos/${video._id}_${Date.now()}.mp4`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('videos')
          .upload(fileName, buffer, {
            contentType: 'video/mp4',
            upsert: false
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('videos')
          .getPublicUrl(fileName);

        // Update database with new URL
        video.videoUrl = urlData.publicUrl;
        
        // Migrate thumbnail if exists
        if (video.thumbnail && video.thumbnail.includes('cloudinary')) {
          const thumbResponse = await axios.get(video.thumbnail, {
            responseType: 'arraybuffer'
          });
          
          const thumbBuffer = Buffer.from(thumbResponse.data);
          const thumbFileName = `thumbnails/${video._id}_${Date.now()}.jpg`;
          
          const { data: thumbData, error: thumbError } = await supabase.storage
            .from('thumbnails')
            .upload(thumbFileName, thumbBuffer, {
              contentType: 'image/jpeg',
              upsert: false
            });

          if (!thumbError) {
            const { data: thumbUrlData } = supabase.storage
              .from('thumbnails')
              .getPublicUrl(thumbFileName);
            
            video.thumbnail = thumbUrlData.publicUrl;
          }
        }

        await video.save();
        successCount++;
        console.log(`✓ Migrated: ${video.title}`);
      }
    } catch (error) {
      failCount++;
      console.error(`✗ Failed to migrate video ${video._id}:`, error.message);
    }
  }

  console.log(`\nVideo Migration Complete:`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

async function migrateShorts() {
  console.log('\nStarting shorts migration...');
  
  const shorts = await Short.find({});
  let successCount = 0;
  let failCount = 0;

  for (const short of shorts) {
    try {
      if (short.videoUrl && short.videoUrl.includes('cloudinary')) {
        console.log(`Migrating short: ${short._id}`);
        
        const response = await axios.get(short.videoUrl, {
          responseType: 'arraybuffer'
        });
        
        const buffer = Buffer.from(response.data);
        const fileName = `shorts/${short._id}_${Date.now()}.mp4`;
        
        const { data, error } = await supabase.storage
          .from('shorts')
          .upload(fileName, buffer, {
            contentType: 'video/mp4',
            upsert: false
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('shorts')
          .getPublicUrl(fileName);

        short.videoUrl = urlData.publicUrl;
        await short.save();
        
        successCount++;
        console.log(`✓ Migrated short: ${short._id}`);
      }
    } catch (error) {
      failCount++;
      console.error(`✗ Failed to migrate short ${short._id}:`, error.message);
    }
  }

  console.log(`\nShorts Migration Complete:`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

async function migrateUserAvatars() {
  console.log('\nStarting user avatar migration...');
  
  const users = await User.find({});
  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    try {
      if (user.profilePic && user.profilePic.includes('cloudinary')) {
        console.log(`Migrating avatar for user: ${user.channelName}`);
        
        const response = await axios.get(user.profilePic, {
          responseType: 'arraybuffer'
        });
        
        const buffer = Buffer.from(response.data);
        const fileName = `avatars/${user._id}_${Date.now()}.jpg`;
        
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        user.profilePic = urlData.publicUrl;
        await user.save();
        
        successCount++;
        console.log(`✓ Migrated avatar: ${user.channelName}`);
      }
    } catch (error) {
      failCount++;
      console.error(`✗ Failed to migrate avatar ${user._id}:`, error.message);
    }
  }

  console.log(`\nUser Avatar Migration Complete:`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB');

    await migrateVideos();
    await migrateShorts();
    await migrateUserAvatars();

    console.log('\n🎉 All migrations completed!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();