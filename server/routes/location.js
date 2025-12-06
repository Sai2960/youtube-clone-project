// server/routes/location.js - COMPLETE MERGED & FIXED VERSION
import express from 'express';
import geoip from 'geoip-lite';
import moment from 'moment-timezone';
import { locationMiddleware } from '../middleware/detectLocation.js';
import otpController from '../controllers/otp.js';

const router = express.Router();

const SOUTH_INDIAN_STATES = [
  'Tamil Nadu', 'Kerala', 'Karnataka', 
  'Andhra Pradesh', 'Telangana', 
  'TN', 'KL', 'KA', 'AP', 'TS'
];

// ✅ AUTOMATIC LOCATION CHECK WITH ENHANCED DEBUGGING
router.get('/check-location', locationMiddleware, async (req, res) => {
  try {
    // Start with middleware-detected location
    let locationData = req.userLocation;
    
    // ✅ FALLBACK: If middleware didn't provide data, do manual detection
    if (!locationData || !locationData.state) {
      console.log('⚠️ Middleware detection incomplete, using fallback...');
      
      // Get real IP
      let ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.connection.remoteAddress || 
               req.ip || 
               '127.0.0.1';

      // Clean IPv6 prefix
      ip = ip.replace('::ffff:', '');
      
      console.log('📍 Fallback: Checking location for IP:', ip);

      let state = 'Unknown';
      let country = 'IN';
      let timezone = 'Asia/Kolkata';
      let city = 'Unknown';
      let latitude = null;
      let longitude = null;
      let method = 'fallback-geoip';
      
      // ✅ LOCALHOST/TESTING LOGIC
      if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168')) {
        // 🧪 CHECK .env FIRST for testing
        if (process.env.TEST_GEO_STATE) {
          state = process.env.TEST_GEO_STATE;
          console.log('🧪 TEST MODE - Using .env state:', state);
          method = 'test-env';
        } else {
          state = 'Tamil Nadu'; // Default test state
          console.log('🏠 LOCALHOST - Using default test state:', state);
          method = 'localhost-default';
        }
      } 
      // ✅ PRODUCTION: Real GeoIP Lookup
      else {
        const geo = geoip.lookup(ip);
        if (geo) {
          state = geo.region || 'Unknown';
          city = geo.city || 'Unknown';
          country = geo.country || 'IN';
          timezone = geo.timezone || 'Asia/Kolkata';
          latitude = geo.ll?.[0] || null;
          longitude = geo.ll?.[1] || null;
          console.log('🌍 GeoIP Result:', { ip, state, city, country, timezone });
          method = 'geoip-lookup';
        } else {
          console.warn('⚠️ GeoIP lookup failed, using defaults');
          state = 'Maharashtra'; // Fallback
          method = 'fallback-default';
        }
      }

      // ✅ CHECK IF SOUTH INDIA
      const isSouthIndia = SOUTH_INDIAN_STATES.some(s => 
        state.toLowerCase().includes(s.toLowerCase())
      );

      // ✅ GET CURRENT TIME IN IST
      const currentTime = moment().tz('Asia/Kolkata');
      const hour = currentTime.hour();
      const minute = currentTime.minute();
      const isMorningTime = hour >= 10 && hour < 12;

      // ✅ DETERMINE THEME & OTP METHOD
      let theme = 'dark';
      let otpMethod = 'sms';

      if (isSouthIndia) {
        otpMethod = 'email'; // South India = Email OTP
        if (isMorningTime) {
          theme = 'light'; // Only 10 AM - 12 PM = Light Theme
        }
      }

      // Build fallback location data
      locationData = {
        state,
        city,
        country,
        timezone,
        ip,
        latitude,
        longitude,
        theme,
        otpMethod,
        isSouthIndia,
        method
      };
    }

    // ✅ GET CURRENT TIME IN IST - WITH DETAILED LOGGING
    const currentTime = moment().tz('Asia/Kolkata');
    const hour = currentTime.hour();
    const minute = currentTime.minute();
    const isMorningTime = hour >= 10 && hour < 12;

    // 🔍 DETAILED TIME DEBUGGING
    console.log('⏰ ═══════════════════════════════════════');
    console.log('⏰ TIME CHECK (IST):');
    console.log('   Server Time (UTC):', moment().utc().format('YYYY-MM-DD HH:mm:ss'));
    console.log('   IST Time:', currentTime.format('YYYY-MM-DD HH:mm:ss'));
    console.log('   Current Hour:', hour);
    console.log('   Current Minute:', minute);
    console.log('   Is Morning (10-12):', isMorningTime);
    console.log('   Hour >= 10:', hour >= 10);
    console.log('   Hour < 12:', hour < 12);
    console.log('⏰ ═══════════════════════════════════════');

    // Re-check South India status
    if (locationData.isSouthIndia === undefined) {
      locationData.isSouthIndia = SOUTH_INDIAN_STATES.some(s => 
        locationData.state.toLowerCase().includes(s.toLowerCase())
      );
    }

    // 🔍 DETAILED LOCATION DEBUGGING
    console.log('📍 ═══════════════════════════════════════');
    console.log('📍 LOCATION CHECK:');
    console.log('   State:', locationData.state);
    console.log('   Is South India:', locationData.isSouthIndia);
    console.log('   Matched States:', SOUTH_INDIAN_STATES.filter(s => 
      locationData.state.toLowerCase().includes(s.toLowerCase())
    ));
    console.log('📍 ═══════════════════════════════════════');

    // ✅ DETERMINE THEME & OTP METHOD (Override if needed)
    locationData.theme = 'dark';
    locationData.otpMethod = 'sms';
    
    if (locationData.isSouthIndia) {
      locationData.otpMethod = 'email';
      if (isMorningTime) {
        locationData.theme = 'light';
      }
    }

    // 🔍 FINAL DECISION LOGGING
    console.log('🎨 ═══════════════════════════════════════');
    console.log('🎨 FINAL THEME DETERMINATION:');
    console.log('   IP:', locationData.ip);
    console.log('   State:', locationData.state);
    console.log('   City:', locationData.city);
    console.log('   Is South India:', locationData.isSouthIndia);
    console.log('   Current Hour (IST):', hour);
    console.log('   Is Morning (10-12):', isMorningTime);
    console.log('   ✨ FINAL THEME:', locationData.theme); // ← KEY OUTPUT
    console.log('   📧 OTP Method:', locationData.otpMethod);
    console.log('   Detection Method:', locationData.method);
    console.log('🎨 ═══════════════════════════════════════');

    res.json({
      success: true,
      location: {
        state: locationData.state,
        city: locationData.city,
        country: locationData.country,
        timezone: locationData.timezone,
        ip: locationData.ip,
        coordinates: {
          latitude: locationData.latitude,
          longitude: locationData.longitude
        }
      },
      theme: locationData.theme, // ← CRITICAL
      otpMethod: locationData.otpMethod,
      isSouthIndia: locationData.isSouthIndia,
      currentHour: hour,
      currentMinute: minute, // Add this
      isMorningTime,
      detectionMethod: locationData.method,
      timestamp: new Date().toISOString(),
      // 🔍 Add debug info
      debug: {
        serverTimeUTC: moment().utc().format('YYYY-MM-DD HH:mm:ss'),
        serverTimeIST: currentTime.format('YYYY-MM-DD HH:mm:ss'),
        hour,
        minute,
        isMorningTime,
        hourCheck: { 
          isGreaterEqual10: hour >= 10, 
          isLessThan12: hour < 12 
        }
      }
    });

  } catch (error) {
    console.error('❌ Check location error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      theme: 'dark',
      otpMethod: 'sms'
    });
  }
});

// ✅ DEBUG ROUTE - Test theme logic for all states
router.get('/debug-theme', (req, res) => {
  const currentTime = moment().tz('Asia/Kolkata');
  const hour = currentTime.hour();
  const minute = currentTime.minute();
  const isMorningTime = hour >= 10 && hour < 12;
  
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
    const isSouth = SOUTH_INDIAN_STATES.some(s => 
      state.toLowerCase().includes(s.toLowerCase())
    );
    
    let theme = 'dark';
    let otpMethod = 'sms';
    
    if (isSouth) {
      otpMethod = 'email';
      if (isMorningTime) {
        theme = 'light';
      }
    }
    
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
      hour,
      minute,
      isMorningTime,
      hourCheck: {
        isGreaterEqual10: hour >= 10,
        isLessThan12: hour < 12
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
  const { state, hour: testHour } = req.query;
  
  if (!state) {
    return res.status(400).json({
      error: 'Please provide a state parameter. Example: /test-theme?state=Tamil Nadu&hour=11'
    });
  }
  
  // Use provided hour or current hour
  const currentTime = moment().tz('Asia/Kolkata');
  const hour = testHour ? parseInt(testHour) : currentTime.hour();
  const isMorningTime = hour >= 10 && hour < 12;
  
  const isSouthIndia = SOUTH_INDIAN_STATES.some(s => 
    state.toLowerCase().includes(s.toLowerCase())
  );
  
  let theme = 'dark';
  let otpMethod = 'sms';
  
  if (isSouthIndia) {
    otpMethod = 'email';
    if (isMorningTime) {
      theme = 'light';
    }
  }
  
  res.json({
    input: {
      state,
      hour,
      currentRealHour: currentTime.hour()
    },
    analysis: {
      isSouthIndia,
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
    explanation: isSouthIndia 
      ? (isMorningTime 
          ? `✅ ${state} is South India + Hour ${hour} is Morning (10-12) = Light theme + Email OTP`
          : `🌙 ${state} is South India + Hour ${hour} is NOT Morning = Dark theme + Email OTP`)
      : `📱 ${state} is NOT South India = Dark theme + SMS OTP`,
    timestamp: currentTime.format('YYYY-MM-DD HH:mm:ss')
  });
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