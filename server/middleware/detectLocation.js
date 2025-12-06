// server/middleware/detectLocation.js
import { detectLocation, isSouthIndianState, determineTheme, determineOtpMethod } from '../utils/locationDetector.js';

/**
 * 🌍 Middleware to automatically detect and attach location data
 */
export const locationMiddleware = async (req, res, next) => {
  try {
    console.log('\n🌍 ===== LOCATION DETECTION MIDDLEWARE =====');
    
    // Detect location
    const locationData = await detectLocation(req);
    
    // Attach to request object
    req.userLocation = {
      ...locationData,
      isSouthIndia: isSouthIndianState(locationData.state),
      theme: determineTheme(locationData.state),
      otpMethod: determineOtpMethod(locationData.state)
    };
    
    console.log('✅ Location attached to request:');
    console.log('   State:', req.userLocation.state);
    console.log('   City:', req.userLocation.city);
    console.log('   Theme:', req.userLocation.theme);
    console.log('   OTP Method:', req.userLocation.otpMethod);
    console.log('   Detection Method:', req.userLocation.method);
    console.log('═══════════════════════════════════════\n');
    
    next();
  } catch (error) {
    console.error('❌ Location middleware error:', error);
    
    // Continue with default location on error
    req.userLocation = {
      state: 'Maharashtra',
      city: 'Mumbai',
      country: 'IN',
      timezone: 'Asia/Kolkata',
      isSouthIndia: false,
      theme: 'dark',
      otpMethod: 'sms',
      method: 'fallback'
    };
    
    next();
  }
};