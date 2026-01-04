export const initKeepAlive = () => {
  if (typeof window === 'undefined') return;
  
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://youtube-clone-project-production.up.railway.app';
  
  const ping = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/health`, { 
        method: 'GET',
        cache: 'no-store'
      });
      console.log('✅ Backend pinged successfully');
    } catch (error) {
      console.error('❌ Keep-alive ping failed:', error);
    }
  };
  
  // Initial ping
  ping();
  
  // Ping every 10 minutes
  setInterval(ping, 10 * 60 * 1000);
};