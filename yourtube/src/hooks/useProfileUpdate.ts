// src/hooks/useProfileUpdate.ts - ENHANCED VERSION
import { useCallback } from 'react';

export const useProfileUpdate = () => {
  const triggerAvatarRefresh = useCallback(() => {
    console.log('📢 Broadcasting avatar update to all components...');
    
    // 1. Update timestamp in localStorage to force re-renders
    const timestamp = Date.now();
    localStorage.setItem('avatarUpdateTime', timestamp.toString());
    
    // 2. Dispatch event that ALL components listen for
    window.dispatchEvent(new CustomEvent('avatarUpdated', {
      detail: { 
        timestamp,
        source: 'profile-update'
      }
    }));
    
    // 3. Force Shorts to refresh
    window.dispatchEvent(new CustomEvent('forceChannelRefresh', {
      detail: { 
        timestamp,
        reason: 'avatar-update'
      }
    }));
    
    // 4. Clear browser caches
    if ('caches' in window) {
      caches.keys().then((names: string[]) => {
        names.forEach((name: string) => {
          caches.delete(name).catch((e: unknown) => 
            console.warn('Cache delete error:', e)
          );
        });
      }).catch((e: unknown) => 
        console.warn('Cache keys error:', e)
      );
    }
    
    // 5. Clear specific image cache in session storage
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.includes('image') || key.includes('avatar')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Session storage clear error:', e);
    }
    
    // 6. Reload page after ensuring all events are processed
    setTimeout(() => {
      console.log('🔄 Reloading page to refresh all components...');
      window.location.reload();
    }, 500);
  }, []);

  // Additional helper to refresh without reload (for minor updates)
  const softRefresh = useCallback(() => {
    console.log('🔄 Soft refresh - no page reload');
    
    const timestamp = Date.now();
    localStorage.setItem('avatarUpdateTime', timestamp.toString());
    
    window.dispatchEvent(new CustomEvent('avatarUpdated', {
      detail: { timestamp, soft: true }
    }));
    
    window.dispatchEvent(new CustomEvent('forceChannelRefresh', {
      detail: { timestamp, soft: true }
    }));
  }, []);

  return { 
    triggerAvatarRefresh,
    softRefresh 
  };
};