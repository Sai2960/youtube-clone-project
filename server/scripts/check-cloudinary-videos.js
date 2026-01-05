// server/scripts/check-cloudinary-videos.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import mongoose from 'mongoose';
import videofiles from '../Modals/video.js';
import cloudinary from 'cloudinary';
import fetch from 'node-fetch';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function checkCloudinaryVideos() {
  console.log('\n🔍 ===== CHECKING CLOUDINARY VIDEOS =====\n');

  await mongoose.connect(process.env.DB_URL, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log('✅ MongoDB connected\n');

  const videos = await videofiles.find({ 
    filepath: { $regex: 'cloudinary.com' },
  });

  console.log(`📊 Found ${videos.length} videos with Cloudinary URLs\n`);
  console.log('=' .repeat(70));

  let existing = 0;
  let missing = 0;
  let errors = 0;

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const num = `[${i + 1}/${videos.length}]`;
    
    try {
      // Extract public_id
      const urlParts = video.filepath.split('/upload/');
      if (urlParts.length !== 2) {
        console.log(`${num} ⚠️  Invalid URL format: ${video.videotitle}`);
        errors++;
        continue;
      }
      
      const afterUpload = urlParts[1];
      const withoutExt = afterUpload.replace(/\.(mp4|mov|avi|webm)$/i, '');
      const parts = withoutExt.split('/');
      const pathParts = [];
      let foundPath = false;
      
      for (const part of parts) {
        if (!foundPath && (part.includes(',') || part.includes(':') || /^v\d+$/.test(part))) {
          continue;
        }
        foundPath = true;
        pathParts.push(part);
      }
      
      const publicId = pathParts.join('/');
      
      // Check if video exists using HEAD request
      const checkUrl = cloudinary.v2.url(publicId, {
        resource_type: 'video',
        type: 'upload',
        sign_url: true,
        secure: true,
      });
      
      const response = await fetch(checkUrl, { 
        method: 'HEAD',
        timeout: 10000 
      });
      
      if (response.ok) {
        console.log(`${num} ✅ EXISTS: ${video.videotitle}`);
        console.log(`     ID: ${video._id}`);
        console.log(`     Public ID: ${publicId}`);
        existing++;
      } else {
        console.log(`${num} ❌ MISSING (${response.status}): ${video.videotitle}`);
        console.log(`     ID: ${video._id}`);
        console.log(`     Public ID: ${publicId}`);
        console.log(`     URL: ${video.filepath.substring(0, 80)}...`);
        missing++;
      }
      
    } catch (error) {
      console.log(`${num} ⚠️  ERROR: ${video.videotitle}`);
      console.log(`     ${error.message}`);
      errors++;
    }
    
    console.log('-'.repeat(70));
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Existing in Cloudinary: ${existing}`);
  console.log(`❌ Missing from Cloudinary: ${missing}`);
  console.log(`⚠️  Errors: ${errors}`);
  console.log(`📊 Total: ${videos.length}`);
  console.log('='.repeat(70) + '\n');

  if (missing > 0) {
    console.log('💡 RECOMMENDATIONS:');
    console.log('   1. Videos are missing from Cloudinary (deleted or never uploaded)');
    console.log('   2. You have two options:');
    console.log('      a) Delete these video records from database');
    console.log('      b) Re-upload the videos if you have them locally');
    console.log('   3. Migration will only work for videos that exist in Cloudinary\n');
  }

  await mongoose.disconnect();
  process.exit(0);
}

checkCloudinaryVideos().catch((error) => {
  console.error('\n❌ Script error:', error);
  process.exit(1);
});