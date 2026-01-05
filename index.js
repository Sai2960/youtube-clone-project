import('./server/index.js')
  .then((module) => {
    console.log('✅ Server module loaded successfully');
    console.log('✅ Module exports:', Object.keys(module));
  })
  .catch((error) => {
    console.error('❌ CRITICAL: Failed to load server module');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Code:', error.code);
    process.exit(1);
  });

// Keep process alive
console.log('✅ index.js setup complete');