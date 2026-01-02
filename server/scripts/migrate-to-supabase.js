import videofiles from '../Modals/video.js';
import { supabase } from '../config/supabase.js';
import fetch from 'node-fetch';

async function migrateVideos() {
  const videos = await videofiles.find({ 
    filepath: { $regex: 'cloudinary.com' } 
  }).limit(10);

  console.log(`📦 Found ${videos.length} Cloudinary videos`);

  for (const video of videos) {
    try {
      console.log(`🔄 Migrating: ${video.videotitle}`);
      
      // Download from Cloudinary
      const response = await fetch(video.filepath);
      const buffer = await response.arrayBuffer();
      
      // Upload to Supabase
      const fileName = `migrated-${video._id}.mp4`;
      const { data, error } = await supabase.storage
        .from('youtube-videos')
        .upload(fileName, buffer, {
          contentType: 'video/mp4'
        });

      if (error) throw error;

      // Get new URL
      const { data: { publicUrl } } = supabase.storage
        .from('youtube-videos')
        .getPublicUrl(fileName);

      // Update database
      video.filepath = publicUrl;s
      video.videofile = publicUrl;
      video.videoLink = publicUrl;
      await video.save();

      console.log(`✅ Migrated: ${video.videotitle}`);
    } catch (error) {
      console.error(`❌ Failed to migrate ${video._id}:`, error);
    }
  }

  console.log('🎉 Migration complete!');
  process.exit(0);
}

migrateVideos();