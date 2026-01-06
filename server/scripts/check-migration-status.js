// server/scripts/check-migration-status.js
import videofiles from '../Modals/video.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const checkMigrationStatus = async () => {
  try {
    console.log('\n📊 ===== MIGRATION STATUS CHECK =====\n');

    await mongoose.connect(process.env.MONGODB_URI);

    // Total videos
    const totalVideos = await videofiles.countDocuments();
    console.log(`Total Videos: ${totalVideos}`);

    // Videos still on Cloudinary
    const cloudinaryVideos = await videofiles.countDocuments({
      $or: [
        { filepath: { $regex: 'cloudinary.com' } },
        { videofile: { $regex: 'cloudinary.com' } },
        { videoLink: { $regex: 'cloudinary.com' } }
      ]
    });

    // Videos on Supabase
    const supabaseVideos = await videofiles.countDocuments({
      $or: [
        { filepath: { $regex: 'supabase.co' } },
        { videofile: { $regex: 'supabase.co' } },
        { videoLink: { $regex: 'supabase.co' } }
      ]
    });

    // Videos with old Render URLs
    const renderVideos = await videofiles.countDocuments({
      $or: [
        { filepath: { $regex: 'onrender.com' } },
        { videofile: { $regex: 'onrender.com' } },
        { videoLink: { $regex: 'onrender.com' } }
      ]
    });

    // Videos with Railway URLs
    const railwayVideos = await videofiles.countDocuments({
      $or: [
        { filepath: { $regex: 'railway.app' } },
        { videofile: { $regex: 'railway.app' } },
        { videoLink: { $regex: 'railway.app' } }
      ]
    });

    // Videos with migration metadata
    const migratedVideos = await videofiles.countDocuments({
      migratedAt: { $exists: true }
    });

    console.log('\n📦 Storage Distribution:');
    console.log(`   Cloudinary: ${cloudinaryVideos} (${((cloudinaryVideos/totalVideos)*100).toFixed(1)}%)`);
    console.log(`   Supabase: ${supabaseVideos} (${((supabaseVideos/totalVideos)*100).toFixed(1)}%)`);
    console.log(`   Other/Local: ${totalVideos - cloudinaryVideos - supabaseVideos}`);

    console.log('\n🌐 Backend URLs:');
    console.log(`   Render (old): ${renderVideos}`);
    console.log(`   Railway (new): ${railwayVideos}`);

    console.log('\n✅ Migration Status:');
    console.log(`   Migrated: ${migratedVideos} (${((migratedVideos/totalVideos)*100).toFixed(1)}%)`);
    console.log(`   Remaining: ${cloudinaryVideos}`);

    // Sample videos still on Cloudinary
    if (cloudinaryVideos > 0) {
      console.log('\n📋 Sample Videos Still on Cloudinary:');
      const samples = await videofiles
        .find({
          $or: [
            { filepath: { $regex: 'cloudinary.com' } },
            { videofile: { $regex: 'cloudinary.com' } }
          ]
        })
        .limit(5)
        .select('_id videotitle filepath');

      samples.forEach(video => {
        console.log(`   - ${video.videotitle} (${video._id})`);
        console.log(`     ${video.filepath?.substring(0, 60)}...`);
      });
    }

    // Thumbnail status
    const cloudinaryThumbnails = await videofiles.countDocuments({
      $or: [
        { thumbnail: { $regex: 'cloudinary.com' } },
        { videothumbnail: { $regex: 'cloudinary.com' } }
      ]
    });

    const supabaseThumbnails = await videofiles.countDocuments({
      $or: [
        { thumbnail: { $regex: 'supabase.co' } },
        { videothumbnail: { $regex: 'supabase.co' } }
      ]
    });

    console.log('\n🖼️ Thumbnail Distribution:');
    console.log(`   Cloudinary: ${cloudinaryThumbnails}`);
    console.log(`   Supabase: ${supabaseThumbnails}`);
    console.log(`   Other: ${totalVideos - cloudinaryThumbnails - supabaseThumbnails}`);

    // Progress bar
    const progress = ((supabaseVideos / totalVideos) * 100).toFixed(1);
    const barLength = 50;
    const filled = Math.round((progress / 100) * barLength);
    const empty = barLength - filled;
    const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

    console.log('\n📈 Migration Progress:');
    console.log(`   [${progressBar}] ${progress}%`);

    if (cloudinaryVideos === 0) {
      console.log('\n✅ MIGRATION COMPLETE! All videos migrated to Supabase.');
    } else {
      console.log(`\n⚠️ ${cloudinaryVideos} videos still need migration.`);
      console.log('\nRun: npm run migrate:cloudinary-to-supabase');
    }

    console.log('\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error checking migration status:', error);
    process.exit(1);
  }
};

checkMigrationStatus();