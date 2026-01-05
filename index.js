// index.js - Railway Entry Point
// This file allows Railway to start the server from root directory

import('./server/index.js')
  .then(() => {
    console.log('✅ Server module loaded successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to load server module:', error);
    process.exit(1);
  });