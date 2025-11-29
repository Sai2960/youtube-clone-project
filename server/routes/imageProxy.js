// server/routes/imageProxy.js - ES MODULE VERSION

import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * Proxy route for external images (especially Google OAuth avatars)
 * This bypasses CORS restrictions by fetching images server-side
 */
router.get('/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: 'URL parameter is required' 
      });
    }

    // Validate URL (only allow specific domains)
    const allowedDomains = [
      'lh3.googleusercontent.com',
      'graph.facebook.com',
      'platform-lookaside.fbsbx.com'
    ];

    const urlObj = new URL(url);
    const isAllowed = allowedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      return res.status(403).json({ 
        success: false, 
        message: 'Domain not allowed' 
      });
    }

    console.log('🖼️ Proxying image:', url);

    // Fetch the image
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });

    // Get content type
    const contentType = response.headers['content-type'] || 'image/jpeg';

    // Set cache headers (cache for 1 hour)
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });

    // Send the image
    res.send(Buffer.from(response.data));

  } catch (error) {
    console.error('❌ Image proxy error:', error.message);
    
    // Return a default avatar SVG on error
    const defaultAvatar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#888">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>`;

    res.set({
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
    });

    res.send(defaultAvatar);
  }
});

export default router;