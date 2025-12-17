// server/routes/location.js - COMPLETE MERGED & FIXED VERSION
import express from 'express';
import geoip from 'geoip-lite';
import moment from 'moment-timezone';
import { locationMiddleware } from '../middleware/detectLocation.js';
import { 
  detectLocation, 
  isSouthIndianState, 
  determineTheme, 
  determineOtpMethod 
} from '../utils/locationDetector.js';
import otpController from '../controllers/otp.js';

const router = express.Router();

const SOUTH_INDIAN_STATES = [
  'Tamil Nadu', 'Kerala', 'Karnataka', 
  'Andhra Pradesh', 'Telangana', 
  'TN', 'KL', 'KA', 'AP', 'TS', 'TG'
];

// ✅ MAIN LOCATION CHECK WITH AUTOMATIC DETECTION & ENHANCED DEBUGGING
router.get('/check-location', locationMiddleware, async (req, res) => {
  try {
    console.log('🌍 Location check request received');
    
    // Start with middleware-detected location
    let locationData = req.userLocation;
    
    // ✅ FALLBACK: If middleware didn't provide data, use utility function
    if (!locationData || !locationData.state) {
      console.log('⚠️ Middleware detection incomplete, using utility detector...');
      locationData = await detectLocation(req);
    }
    
    // ✅ ADDITIONAL FALLBACK: If still no data, do manual detection
    if (!locationData || !locationData.state) {
      console.log('⚠️ Utility detector failed, using manual fallback...');
      
      // Get real IP
      let ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress ||
               req.ip || 
               '127.0.0.1';

      // Clean IPv6 prefix
      ip = ip.replace('::ffff:', '').replace('::1', '127.0.0.1');
      
      console.log('📍 Manual Fallback: Checking location for IP:', ip);

      let state = 'Unknown';
      let country = 'IN';
      let timezone = 'Asia/Kolkata';
      let city = 'Unknown';
      let latitude = null;
      let longitude = null;
      let method = 'manual-fallback';
      
      // ✅ LOCALHOST/TESTING LOGIC
      if (ip === '127.0.0.1' || ip.startsWith('192.168')) {
        // 🧪 CHECK .env FIRST for testing
        if (process.env.TEST_GEO_STATE) {
          state = process.env.TEST_GEO_STATE;
          console.log('🧪 TEST MODE - Using .env state:', state);
          method = 'test-env';
        } else {
          state = process.env.DEFAULT_STATE || 'Maharashtra';
          city = process.env.DEFAULT_CITY || 'Mumbai';
          console.log('🏠 LOCALHOST - Using default state:', state);
          method = 'localhost-default';
        }
      } 
      // ✅ PRODUCTION: Real GeoIP Lookup
      else {
        const geo = geoip.lookup(ip);
        if (geo && geo.country === 'IN') {
          state = geo.region || 'Unknown';
          city = geo.city || 'Unknown';
          country = geo.country;
          timezone = geo.timezone || 'Asia/Kolkata';
          latitude = geo.ll?.[0] || null;
          longitude = geo.ll?.[1] || null;
          console.log('🌍 GeoIP Result:', { ip, state, city, country, timezone });
          method = 'geoip-lookup';
        } else {
          console.warn('⚠️ GeoIP lookup failed, using defaults');
          state = process.env.DEFAULT_STATE || 'Maharashtra';
          city = process.env.DEFAULT_CITY || 'Mumbai';
          method = 'fallback-default';
        }
      }

      // Build fallback location data
      locationData = {
        ip,
        state,
        city,
        country,
        timezone,
        latitude,
        longitude,
        method
      };
    }

    // ✅ USE UTILITY FUNCTIONS FOR THEME/OTP DETERMINATION
    const isSouth = isSouthIndianState(locationData.state);
    const theme = determineTheme(locationData.state);
    const otpMethod = determineOtpMethod(locationData.state);
    
    // ✅ GET CURRENT TIME IN IST - WITH DETAILED LOGGING
    const currentTime = moment().tz('Asia/Kolkata');
    const currentHour = currentTime.hour();
    const currentMinute = currentTime.minute();
    const isMorningTime = currentHour >= 10 && currentHour < 12;

    // 🔍 DETAILED TIME DEBUGGING
    console.log('⏰ ═══════════════════════════════════════');
    console.log('⏰ TIME CHECK (IST):');
    console.log('   Server Time (UTC):', moment().utc().format('YYYY-MM-DD HH:mm:ss'));
    console.log('   IST Time:', currentTime.format('YYYY-MM-DD HH:mm:ss'));
    console.log('   Current Hour:', currentHour);
    console.log('   Current Minute:', currentMinute);
    console.log('   Is Morning (10-12):', isMorningTime);
    console.log('   Hour >= 10:', currentHour >= 10);
    console.log('   Hour < 12:', currentHour < 12);
    console.log('⏰ ═══════════════════════════════════════');

    // 🔍 DETAILED LOCATION DEBUGGING
    console.log('📍 ═══════════════════════════════════════');
    console.log('📍 LOCATION CHECK:');
    console.log('   State:', locationData.state);
    console.log('   City:', locationData.city);
    console.log('   Is South India:', isSouth);
    console.log('   Matched States:', SOUTH_INDIAN_STATES.filter(s => 
      locationData.state.toLowerCase().includes(s.toLowerCase())
    ));
    console.log('📍 ═══════════════════════════════════════');

    // 🔍 FINAL DECISION LOGGING
    console.log('🎨 ═══════════════════════════════════════');
    console.log('🎨 FINAL THEME DETERMINATION:');
    console.log('   IP:', locationData.ip);
    console.log('   State:', locationData.state);
    console.log('   City:', locationData.city);
    console.log('   Is South India:', isSouth);
    console.log('   Current Hour (IST):', currentHour);
    console.log('   Is Morning (10-12):', isMorningTime);
    console.log('   ✨ FINAL THEME:', theme); // ← KEY OUTPUT
    console.log('   📧 OTP Method:', otpMethod);
    console.log('   Detection Method:', locationData.method);
    console.log('🎨 ═══════════════════════════════════════');

    // ✅ BUILD RESPONSE
    const response = {
      success: true,
      location: {
        state: locationData.state,
        city: locationData.city,
        country: locationData.country,
        timezone: locationData.timezone,
        ip: locationData.ip,
        coordinates: locationData.latitude && locationData.longitude ? {
          latitude: locationData.latitude,
          longitude: locationData.longitude
        } : undefined
      },
      theme, // ← CRITICAL
      otpMethod,
      isSouthIndia: isSouth,
      currentHour,
      currentMinute,
      isMorningTime,
      detectionMethod: locationData.method,
      timestamp: new Date().toISOString(),
      // 🔍 Add debug info
      debug: {
        serverTimeUTC: moment().utc().format('YYYY-MM-DD HH:mm:ss'),
        serverTimeIST: currentTime.format('YYYY-MM-DD HH:mm:ss'),
        hour: currentHour,
        minute: currentMinute,
        isMorningTime,
        hourCheck: { 
          isGreaterEqual10: currentHour >= 10, 
          isLessThan12: currentHour < 12 
        }
      }
    };

    console.log('✅ Location response:', {
      state: response.location.state,
      theme: response.theme,
      otpMethod: response.otpMethod
    });

    res.json(response);

  } catch (error) {
    console.error('❌ Check location error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      location: null,
      theme: 'dark',
      otpMethod: 'sms'
    });
  }
});

// ✅ DEBUG ROUTE - Test theme logic for all states
router.get('/debug-theme', (req, res) => {
  const currentTime = moment().tz('Asia/Kolkata');
  const currentHour = currentTime.hour();
  const currentMinute = currentTime.minute();
  const isMorningTime = currentHour >= 10 && currentHour < 12;
  
  const testStates = [
    'Tamil Nadu',
    'Kerala', 
    'Karnataka',
    'Andhra Pradesh',
    'Telangana',
    'Maharashtra',
    'Delhi',
    'Gujarat',
    'West Bengal',
    'Uttar Pradesh'
  ];
  
  const results = testStates.map(state => {
    const isSouth = isSouthIndianState(state);
    const theme = determineTheme(state);
    const otpMethod = determineOtpMethod(state);
    
    return {
      state,
      isSouthIndia: isSouth,
      theme,
      otpMethod,
      explanation: isSouth 
        ? (isMorningTime 
            ? '✅ South India + Morning (10-12) = Light theme + Email OTP'
            : '🌙 South India + Not Morning = Dark theme + Email OTP')
        : '📱 Not South India = Dark theme + SMS OTP'
    };
  });
  
  res.json({
    currentTime: {
      utc: moment().utc().format('YYYY-MM-DD HH:mm:ss'),
      ist: currentTime.format('YYYY-MM-DD HH:mm:ss'),
      hour: currentHour,
      minute: currentMinute,
      isMorningTime,
      hourCheck: {
        isGreaterEqual10: currentHour >= 10,
        isLessThan12: currentHour < 12
      }
    },
    rules: {
      southIndianStates: SOUTH_INDIAN_STATES,
      morningHours: '10:00 AM - 11:59 AM',
      logic: [
        '1. If South India + Morning (10-12) → Light theme + Email OTP',
        '2. If South India + Not Morning → Dark theme + Email OTP',
        '3. If Not South India → Dark theme + SMS OTP'
      ]
    },
    testResults: results,
    summary: {
      totalStates: testStates.length,
      southIndianStates: results.filter(r => r.isSouthIndia).length,
      lightThemeStates: results.filter(r => r.theme === 'light').length,
      emailOTPStates: results.filter(r => r.otpMethod === 'email').length
    }
  });
});

// ✅ MANUAL THEME TEST - Override with specific parameters
router.get('/test-theme', (req, res) => {
  try {
    const { state, hour: testHour } = req.query;
    
    if (!state) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a state parameter. Example: /test-theme?state=Tamil Nadu&hour=11'
      });
    }
    
    // Use provided hour or current hour
    const currentTime = moment().tz('Asia/Kolkata');
    const hour = testHour ? parseInt(testHour) : currentTime.hour();
    const isMorningTime = hour >= 10 && hour < 12;
    
    const isSouth = isSouthIndianState(state);
    
    // Determine theme and OTP method
    let theme = 'dark';
    let otpMethod = 'sms';
    
    if (isSouth) {
      otpMethod = 'email';
      if (isMorningTime) {
        theme = 'light';
      }
    }
    
    res.json({
      success: true,
      input: {
        state,
        hour,
        currentRealHour: currentTime.hour()
      },
      analysis: {
        isSouthIndia: isSouth,
        isMorningTime,
        hourCheck: {
          hour,
          isGreaterEqual10: hour >= 10,
          isLessThan12: hour < 12
        }
      },
      result: {
        theme,
        otpMethod
      },
      explanation: isSouth 
        ? (isMorningTime 
            ? `✅ ${state} is South India + Hour ${hour} is Morning (10-12) = Light theme + Email OTP`
            : `🌙 ${state} is South India + Hour ${hour} is NOT Morning = Dark theme + Email OTP`)
        : `📱 ${state} is NOT South India = Dark theme + SMS OTP`,
      timestamp: currentTime.format('YYYY-MM-DD HH:mm:ss')
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ GET CURRENT SERVER TIME
router.get('/server-time', (req, res) => {
  const utcTime = moment().utc();
  const istTime = moment().tz('Asia/Kolkata');
  
  res.json({
    utc: {
      formatted: utcTime.format('YYYY-MM-DD HH:mm:ss'),
      hour: utcTime.hour(),
      minute: utcTime.minute(),
      timestamp: utcTime.valueOf()
    },
    ist: {
      formatted: istTime.format('YYYY-MM-DD HH:mm:ss'),
      hour: istTime.hour(),
      minute: istTime.minute(),
      timestamp: istTime.valueOf(),
      isMorningTime: istTime.hour() >= 10 && istTime.hour() < 12
    },
    timezoneOffset: '+05:30',
    timezoneName: 'Asia/Kolkata'
  });
});

// ✅ OTP Endpoints
router.post('/send-email-otp', otpController.sendEmailOTP);
router.post('/send-sms-otp', otpController.sendSMSOTP);
router.post('/verify-otp', otpController.verifyOTP);

export default router;