// scripts/update-frontend-urls.js
// Run this in your frontend project root

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const OLD_RENDER_URL = 'https://youtube-clone-project-q3pd.onrender.com'; // Replace with your actual Render URL
const NEW_RAILWAY_URL = 'https://youtube-clone-project-production.up.railway.app';

const OLD_CLOUDINARY_PATTERN = /https?:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/[^"'\s]+/g;
const OLD_RENDER_PATTERN = new RegExp(OLD_RENDER_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

const DRY_RUN = false; // Set to true to preview changes without writing files

// ============================================================================
// FILE SCANNING
// ============================================================================

const EXTENSIONS_TO_SCAN = ['.js', '.jsx', '.ts', '.tsx', '.json', '.env'];
const IGNORE_DIRS = ['node_modules', '.next', 'dist', 'build', '.git'];

const getAllFiles = (dirPath, arrayOfFiles = []) => {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      const ext = path.extname(file);
      if (EXTENSIONS_TO_SCAN.includes(ext)) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
};

// ============================================================================
// URL REPLACEMENT
// ============================================================================

const updateFileUrls = (filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const changes = [];

    // Replace Render URLs with Railway
    if (OLD_RENDER_PATTERN.test(content)) {
      const matches = content.match(OLD_RENDER_PATTERN);
      content = content.replace(OLD_RENDER_PATTERN, NEW_RAILWAY_URL);
      modified = true;
      changes.push(`Render → Railway: ${matches.length} occurrence(s)`);
    }

    // Note Cloudinary URLs (but don't replace - will be handled by backend migration)
    const cloudinaryMatches = content.match(OLD_CLOUDINARY_PATTERN);
    if (cloudinaryMatches) {
      changes.push(`ℹ️ Found ${cloudinaryMatches.length} Cloudinary URL(s) - will be migrated by backend`);
    }

    if (modified && !DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    return { modified, changes };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { modified: false, changes: [], error: error.message };
  }
};

// ============================================================================
// ENV FILE UPDATE
// ============================================================================

const updateEnvFiles = () => {
  const envFiles = ['.env', '.env.local', '.env.production'];
  const results = [];

  envFiles.forEach(envFile => {
    const envPath = path.join(process.cwd(), envFile);
    
    if (fs.existsSync(envPath)) {
      console.log(`\n📄 Updating ${envFile}...`);
      
      let content = fs.readFileSync(envPath, 'utf8');
      let modified = false;

      // Update backend URL
      if (content.includes(OLD_RENDER_URL)) {
        content = content.replace(OLD_RENDER_PATTERN, NEW_RAILWAY_URL);
        modified = true;
        console.log(`   ✅ Updated BACKEND_URL: ${OLD_RENDER_URL} → ${NEW_RAILWAY_URL}`);
      }

      // Ensure Supabase URLs are present
      if (!content.includes('NEXT_PUBLIC_SUPABASE_URL')) {
        console.log(`   ⚠️ NEXT_PUBLIC_SUPABASE_URL not found - add it manually`);
      }

      if (modified && !DRY_RUN) {
        fs.writeFileSync(envPath, content, 'utf8');
        results.push({ file: envFile, status: 'updated' });
      } else if (modified && DRY_RUN) {
        results.push({ file: envFile, status: 'would_update' });
      } else {
        results.push({ file: envFile, status: 'no_changes' });
      }
    }
  });

  return results;
};

// ============================================================================
// MAIN EXECUTION
// ============================================================================

const main = () => {
  console.log('\n🚀 ===== FRONTEND URL MIGRATION =====\n');
  console.log(`Mode: ${DRY_RUN ? '🧪 DRY RUN' : '🔴 LIVE'}`);
  console.log(`Old Render URL: ${OLD_RENDER_URL}`);
  console.log(`New Railway URL: ${NEW_RAILWAY_URL}\n`);

  const projectRoot = process.cwd();
  console.log(`Scanning: ${projectRoot}\n`);

  // Update env files first
  console.log('📝 Updating environment files...');
  const envResults = updateEnvFiles();
  
  console.log('\n📂 Scanning source files...');
  const allFiles = getAllFiles(path.join(projectRoot, 'src'));
  
  console.log(`Found ${allFiles.length} files to check\n`);

  const results = {
    total: allFiles.length,
    modified: 0,
    unchanged: 0,
    errors: 0,
    cloudinaryFound: 0
  };

  allFiles.forEach(filePath => {
    const relativePath = path.relative(projectRoot, filePath);
    const result = updateFileUrls(filePath);

    if (result.error) {
      results.errors++;
      console.log(`❌ ${relativePath}: ${result.error}`);
    } else if (result.modified) {
      results.modified++;
      console.log(`✅ ${relativePath}`);
      result.changes.forEach(change => console.log(`   ${change}`));
    } else if (result.changes.length > 0) {
      console.log(`ℹ️ ${relativePath}`);
      result.changes.forEach(change => console.log(`   ${change}`));
      if (result.changes.some(c => c.includes('Cloudinary'))) {
        results.cloudinaryFound++;
      }
    }
  });

  // Print summary
  console.log('\n\n📊 ===== MIGRATION SUMMARY =====\n');
  console.log(`Total Files Scanned: ${results.total}`);
  console.log(`✅ Modified: ${results.modified}`);
  console.log(`⚪ Unchanged: ${results.total - results.modified - results.errors}`);
  console.log(`❌ Errors: ${results.errors}`);
  console.log(`ℹ️ Files with Cloudinary URLs: ${results.cloudinaryFound}`);

  console.log('\n📝 Environment Files:');
  envResults.forEach(result => {
    const icon = result.status === 'updated' ? '✅' : 
                 result.status === 'would_update' ? '🧪' : '⚪';
    console.log(`   ${icon} ${result.file}: ${result.status}`);
  });

  console.log('\n\n📋 NEXT STEPS:\n');
  console.log('1. Review the changes above');
  console.log('2. Run the backend migration script to move videos to Supabase');
  console.log('3. Test your application with the new URLs');
  console.log('4. Deploy to production\n');

  if (DRY_RUN) {
    console.log('⚠️ This was a DRY RUN - no files were modified');
    console.log('   Set DRY_RUN = false to apply changes\n');
  }
};

// Run the script
main();