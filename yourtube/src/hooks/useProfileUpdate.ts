// src/hooks/useProfileUpdate.ts
export const useProfileUpdate = () => {
  const triggerAvatarRefresh = () => {
    console.log('📢 Broadcasting avatar update to all Shorts...');
    
    // 1. Dispatch event that ShortPlayer listens for
    window.dispatchEvent(new CustomEvent('avatarUpdated', {
      detail: { timestamp: Date.now() }
    }));
    
    // 2. Clear browser caches
    if ('caches' in window) {
      caches.keys().then((names: string[]) => {
        names.forEach((name: string) => {
          caches.delete(name).catch((e: unknown) => console.warn('Cache delete error:', e));
        });
      }).catch((e: unknown) => console.warn('Cache keys error:', e));
    }
    
    // 3. Reload page after short delay to ensure all updates are reflected
    setTimeout(() => {
      console.log('🔄 Reloading page to refresh all components...');
      window.location.reload();
    }, 500);
  };

  return { triggerAvatarRefresh };
};