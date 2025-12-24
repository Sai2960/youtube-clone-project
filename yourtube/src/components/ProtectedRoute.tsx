// src/components/ProtectedRoute.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@/lib/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, isInitializing } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while checking auth state
    if (isInitializing) return;

    // If auth is required but user is not logged in
    if (requireAuth && !user) {
      console.log('🔒 Access denied - redirecting to login');
      router.replace('/login');
    }
  }, [user, isInitializing, requireAuth, router]);

  // Show loading while checking auth
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth required and no user, show nothing (will redirect)
  if (requireAuth && !user) {
    return null;
  }

  // User is authenticated or auth not required
  return <>{children}</>;
}