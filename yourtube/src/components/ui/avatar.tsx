// src/components/ui/avatar.tsx - ULTIMATE FIXED VERSION
import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, ...props }, ref) => {
  const [imageUrl, setImageUrl] = React.useState<string | undefined>(undefined);
  const [imageKey, setImageKey] = React.useState(0);
  const [hasError, setHasError] = React.useState(false);

  // Process source URL with cache-busting
  const processUrl = React.useCallback((source: typeof src): string | undefined => {
    if (!source) return undefined;
    
    // Handle Blob/File objects
    if (source instanceof Blob) {
      return URL.createObjectURL(source);
    }
    
    // Handle string URLs
    if (typeof source === "string") {
      // Skip if already has timestamp
      if (source.includes('?t=') || source.includes('&t=')) {
        return source;
      }
      // Add cache-busting timestamp
      const separator = source.includes('?') ? '&' : '?';
      return `${source}${separator}t=${Date.now()}`;
    }
    
    return undefined;
  }, []);

  // Update image when src changes
  React.useEffect(() => {
    const newUrl = processUrl(src);
    setImageUrl(newUrl);
    setImageKey(prev => prev + 1);
    setHasError(false);
  }, [src, processUrl]);

  // Listen for global avatar update events
  React.useEffect(() => {
    const handleGlobalUpdate = () => {
      const newUrl = processUrl(src);
      setImageUrl(newUrl);
      setImageKey(prev => prev + 1);
      setHasError(false);
      console.log('🔄 Avatar refreshed globally');
    };

    window.addEventListener('avatarUpdated', handleGlobalUpdate);
    window.addEventListener('storage', handleGlobalUpdate);
    window.addEventListener('clearImageCache', handleGlobalUpdate);
    
    return () => {
      window.removeEventListener('avatarUpdated', handleGlobalUpdate);
      window.removeEventListener('storage', handleGlobalUpdate);
      window.removeEventListener('clearImageCache', handleGlobalUpdate);
    };
  }, [src, processUrl]);

  // Handle image load errors
  const handleError = React.useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('❌ Avatar failed to load:', imageUrl);
    setHasError(true);
    e.currentTarget.style.display = 'none';
  }, [imageUrl]);

  // Don't render if error occurred or no URL
  if (hasError || !imageUrl) {
    return null;
  }

  return (
    <AvatarPrimitive.Image
      ref={ref}
      key={imageKey}
      className={cn("aspect-square h-full w-full object-cover", className)}
      src={imageUrl}
      onError={handleError}
      style={{ 
        display: 'block !important' as any,
        visibility: 'visible',
        opacity: 1,
        position: 'relative',
        zIndex: 10
      }}
      {...props}
    />
  )
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold dark:from-blue-600 dark:to-purple-700",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }