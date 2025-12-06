import geoip from 'geoip-lite';
import moment from 'moment-timezone';

// South Indian states
const SOUTH_INDIAN_STATES = [
  'Tamil Nadu', 'TN',
  'Kerala', 'KL', 
  'Karnataka', 'KA',
  'Andhra Pradesh', 'AP',
  'Telangana', 'TS', 'TG'
];

const determineThemeAndOtpMethod = (ip) => {
  // Handle localhost/development
  if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
    const currentHour = moment().tz('Asia/Kolkata').hour();
    const isTimeForLight = currentHour >= 10 && currentHour < 12;
    
    console.log(`🏠 Localhost detected - Current IST hour: ${currentHour}, Light theme: ${isTimeForLight}`);
    
    return {
      state: 'Tamil Nadu', // Simulate South India for testing
      country: 'IN',
      theme: isTimeForLight ? 'light' : 'dark',
      otpMethod: 'email',
      timezone: 'Asia/Kolkata'
    };
  }

  const geo = geoip.lookup(ip);
  let state = null;
  let theme = 'dark';
  let otpMethod = 'sms';
  let country = null;
  let timezone = 'Asia/Kolkata';
  
  if (geo && geo.country === 'IN') {
    state = geo.region;
    country = geo.country;
    timezone = geo.timezone || 'Asia/Kolkata';
    
    // Check if from southern states
    const isSouthIndia = SOUTH_INDIAN_STATES.some(s => 
      state?.toLowerCase().includes(s.toLowerCase()) || 
      s.toLowerCase().includes(state?.toLowerCase())
    );
    
    if (isSouthIndia) {
      otpMethod = 'email';
      
      // Check time (IST timezone)
      const currentTime = moment().tz('Asia/Kolkata');
      const hour = currentTime.hour();
      
      // White theme between 10 AM to 12 PM for South India
      if (hour >= 10 && hour < 12) {
        theme = 'light';
      }
    }
  }
  
  return { 
    state, 
    country,
    theme, 
    otpMethod, 
    timezone 
  };
};

const checkLocation = async (req, res) => {
  try {
    // Get IP from request
    const ip = req.ip || 
                req.headers['x-forwarded-for']?.split(',')[0] || 
                req.connection.remoteAddress || 
                req.socket.remoteAddress;
    
    console.log('🌍 Checking location for IP:', ip);
    
    const result = determineThemeAndOtpMethod(ip);
    
    console.log('📍 Location result:', result);
    
    res.json({
      success: true,
      theme: result.theme,
      otpMethod: result.otpMethod,
      location: {
        state: result.state,
        country: result.country,
        timezone: result.timezone
      }
    });
  } catch (error) {
    console.error('❌ Location check error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check location',
      theme: 'dark',
      otpMethod: 'sms',
      location: null
    });
  }
};

export default { checkLocation };