import axios from 'axios';

const API_URL = "https://youtube-clone-project-q3pd.onrender.com";



export const checkLocationAndTheme = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/check-location`);
    return response.data;
  } catch (error) {
    console.error('Location check failed:', error);
    return { 
      theme: 'dark' as 'light' | 'dark', 
      otpMethod: 'sms' as 'email' | 'sms',
      location: null 
    };
  }
};

export const sendOTP = async (method: 'email' | 'sms', contact: string) => {
  try {
    const endpoint = method === 'email' ? '/api/send-email-otp' : '/api/send-sms-otp';
    const payload = method === 'email' ? { email: contact } : { phoneNumber: contact };
    
    const response = await axios.post(`${API_URL}${endpoint}`, payload);
    return response.data;
  } catch (error) {
    console.error('OTP send failed:', error);
    throw error;
  }
};

export const verifyOTP = async (otp: string, contact?: string) => {
  try {
    const response = await axios.post(`${API_URL}/api/verify-otp`, { otp, contact });
    return response.data;
  } catch (error) {
    console.error('OTP verification failed:', error);
    throw error;
  }
};

// Export applyTheme from here as well for convenience
export { applyTheme, getStoredTheme } from './theme';