// ============================================================================
// CACHE MIDDLEWARE - FIXED VERSION
// ============================================================================

// Simple in-memory cache with Map
const cache = new Map();

// Clean up old cache entries every hour
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of cache.entries()) {
    if (now > value.expiry) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cache cleanup: Removed ${cleaned} expired entries`);
  }
}, 60 * 60 * 1000); // Every hour

// Prevent memory leaks on server restart
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    clearInterval(cleanupInterval);
    cache.clear();
  });
}

// ============================================================================
// CACHE MIDDLEWARE FUNCTION
// ============================================================================
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = req.originalUrl || req.url;
    const cached = cache.get(key);
    
    // Return cached response if it exists and hasn't expired
    if (cached && Date.now() < cached.expiry) {
      console.log('✅ Cache hit:', key, `(expires in ${Math.round((cached.expiry - Date.now()) / 1000)}s)`);
      
      // Set cache headers
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${duration}`);
      
      return res.json(cached.data);
    }
    
    // Cache miss
    console.log('❌ Cache miss:', key);
    
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to cache the response
    res.json = (data) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, {
          data,
          expiry: Date.now() + (duration * 1000),
          timestamp: Date.now()
        });
        console.log('📝 Cache set:', key, `(expires in ${duration}s)`);
        
        // Set cache headers
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', `public, max-age=${duration}`);
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

// ============================================================================
// CACHE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Clear all cache entries
 */
export const clearCache = () => {
  const size = cache.size;
  cache.clear();
  console.log(`🗑️ Cache cleared: ${size} entries removed`);
  return size;
};

/**
 * Clear cache entries matching a pattern
 * @param {string|RegExp} pattern - Pattern to match cache keys
 */
export const clearCachePattern = (pattern) => {
  let cleared = 0;
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
      cleared++;
    }
  }
  
  console.log(`🗑️ Cache pattern cleared: ${cleared} entries removed (pattern: ${pattern})`);
  return cleared;
};

/**
 * Clear cache for specific key
 * @param {string} key - Cache key to clear
 */
export const clearCacheKey = (key) => {
  const deleted = cache.delete(key);
  if (deleted) {
    console.log(`🗑️ Cache key cleared: ${key}`);
  }
  return deleted;
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  const now = Date.now();
  let activeEntries = 0;
  let expiredEntries = 0;
  let totalSize = 0;
  
  for (const [key, value] of cache.entries()) {
    if (now < value.expiry) {
      activeEntries++;
    } else {
      expiredEntries++;
    }
    totalSize += JSON.stringify(value.data).length;
  }
  
  return {
    total: cache.size,
    active: activeEntries,
    expired: expiredEntries,
    sizeKB: Math.round(totalSize / 1024),
    entries: Array.from(cache.keys()).map(key => {
      const entry = cache.get(key);
      return {
        key,
        expiresIn: Math.max(0, Math.round((entry.expiry - now) / 1000)),
        age: Math.round((now - entry.timestamp) / 1000)
      };
    })
  };
};

// Default export
export default cacheMiddleware;