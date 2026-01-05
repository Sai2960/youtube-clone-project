// index.js - Railway Entry Point
// Loads server module with proper error handling

console.log('🚀 Starting YouTube Clone Backend...');
console.log('📍 Loading from: index.js (root)');

import('./server/index.js')
  .then(() => {
    console.log('✅ Server module loaded and running');
  })
  .catch((error) => {
    console.error('❌ CRITICAL: Failed to load server module');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });