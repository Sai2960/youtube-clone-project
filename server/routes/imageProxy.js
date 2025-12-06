// server/routes/imageProxy.js - FIXED VERSION
import express from 'express';
import axios from 'axios';

const router = express.Router();

// ✅ CORS Middleware - ADD THIS FIRST
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

/**
 * Proxy route for external images (Google OAuth, GitHub, etc.)
 */
router.get('/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      console.error('❌ No URL provided');
      return res.status(400).json({ 
        success: false, 
        message: 'URL parameter is required' 
      });
    }

    console.log('🖼️ Proxying image:', url);

    // ✅ FIX: More permissive domain validation
    const allowedDomains = [
      'lh3.googleusercontent.com',
      'graph.facebook.com',
      'platform-lookaside.fbsbx.com',
      'avatars.githubusercontent.com',
      'github.com'
    ];

    let isAllowed = false;
    try {
      const urlObj = new URL(url);
      isAllowed = allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );
    } catch (e) {
      console.error('❌ Invalid URL:', url);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid URL format' 
      });
    }

    if (!isAllowed) {
      console.error('❌ Domain not allowed:', url);
      return res.status(403).json({ 
        success: false, 
        message: 'Domain not allowed' 
      });
    }

    // Fetch the image with better error handling
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000, // Increased timeout
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Accept redirects
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://youtube-clone-project-eosin.vercel.app/',
      }
    });

    // Get content type
    const contentType = response.headers['content-type'] || 'image/jpeg';

    // ✅ Set proper cache headers
    res.set({  
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, immutable',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'X-Content-Type-Options': 'nosniff',
    });

    console.log('✅ Image proxied successfully');
    res.send(Buffer.from(response.data));

  } catch (error) {
    console.error('❌ Image proxy error:', error.message);
    
    // Return a default avatar SVG on error
    const defaultAvatar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6b7280">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
    </svg>`;

    res.set({
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });

    res.status(200).send(defaultAvatar);
  }
});

export default router;