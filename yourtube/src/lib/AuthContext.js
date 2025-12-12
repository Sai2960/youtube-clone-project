/* eslint-disable react-hooks/exhaustive-deps */
// lib/AuthContext.tsx - COMPLETE FIXED VERSION

import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { 
  useState, 
  createContext, 
  useEffect, 
  useContext, 
  useRef, 
  useMemo, 
  useCallback 
} from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { applyTheme } from './theme';
import { disconnectSocket } from './socket';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_AVATAR = '/images/default-avatar.png';
const DEFAULT_THEME = 'dark';
const DEFAULT_OTP_METHOD = 'sms';

// ============================================================================
// CREATE CONTEXT
// ============================================================================

const UserContext = createContext();
// ============================================================================
// USER PROVIDER COMPONENT
// ============================================================================

export const UserProvider = ({ children }) => {
  // ✅ State Management
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  
  // ✅ Refs for tracking
  const hasInitializedRef = useRef(false);
  const authUnsubscribeRef = useRef(null);
  const logoutTimeoutRef = useRef(null);

  // ============================================================================
  // LOGIN FUNCTION - INSIDE COMPONENT (ONLY ONE VERSION)
  // ============================================================================

  const login = useCallback((userdata, token, theme = null, location = null, otpMethod = DEFAULT_OTP_METHOD) => {
    console.log('🔐 ===== LOGIN FUNCTION =====');
    console.log('📦 User data:', {
      id: userdata._id || userdata.id,
      email: userdata.email,
      name: userdata.name,
      hasImage: !!userdata.image,
    });
    console.log('🔑 Token received:', token ? `Yes (${token.length} chars)` : 'NO TOKEN!');
    
    // ✅ CRITICAL: Validate required data
    if (!token) {
      console.error('❌ CRITICAL: No token provided!');
      setError('Authentication failed - no token received');
      return;
    }
    
    if (!userdata._id && !userdata.id) {
      console.error('❌ CRITICAL: No user ID!');
      setError('Authentication failed - invalid user data');
      return;
    }
// ✅ Force complete page refresh on Android to clear all caches
if (typeof window !== 'undefined' && /Android/i.test(navigator.userAgent)) {
  console.log('📱 Android detected - forcing cache clear');
  setTimeout(() => {
    window.location.reload();
  }, 100);
}
    
    
    // ✅ Build enriched user object with all necessary fields
    const enrichedUser = {
      ...userdata,
      _id: userdata._id || userdata.id,
      id: userdata._id || userdata.id,
      image: userdata.image || userdata.avatar || DEFAULT_AVATAR,
      avatar: userdata.image || userdata.avatar || DEFAULT_AVATAR,
      theme: theme || userdata.theme || localStorage.getItem('theme') || DEFAULT_THEME,
      location: location || userdata.location || null,
      preferredOtpMethod: otpMethod || DEFAULT_OTP_METHOD,
      loginTime: new Date().toISOString(),
    };
    
    console.log('💾 Saving enriched user to localStorage');
    
    try {
      // ✅ Save user FIRST
      localStorage.setItem("user", JSON.stringify(enrichedUser));
      
      // ✅ Save token SECOND
      localStorage.setItem("token", token);
      
      // ✅ Update state THIRD
      setUser(enrichedUser);
      
      console.log('✅ LocalStorage updated successfully');
      console.log('✅ User state updated');
      
    } catch (storageError) {
      console.error('❌ Storage error:', storageError);
      setError('Failed to save user data');
      return;
    }
    
    console.log('✅ Login complete\n');
    
    // ✅ Apply theme if provided
    if (theme || userdata.theme) {
      const themeToApply = theme || userdata.theme || DEFAULT_THEME;
      console.log('🎨 Applying theme:', themeToApply);
      applyTheme(themeToApply);
    }
    
    // ✅ Notify other tabs
    window.dispatchEvent(new Event('tokenUpdated'));
    
    // ✅ Clear any previous errors
    setError(null);
    
  }, []); // ✅ Empty deps - stable function

  // ============================================================================
  // UPDATE USER FUNCTION
  // ============================================================================

  const updateUser = useCallback((userData) => {
    console.log('🔄 Updating user data with:', {
      id: userData._id || userData.id,
      email: userData.email,
      hasImage: !!userData.image,
    });
    
    setUser(currentUser => {
      if (!currentUser) {
        console.error('❌ No current user to update');
        return currentUser;
      }
      
      const updatedUser = {
        ...currentUser,
        ...userData,
        _id: userData._id || currentUser._id,
        id: userData._id || currentUser.id || currentUser._id,
        email: userData.email || currentUser.email,
        image: userData.image || currentUser.image,
        avatar: userData.image || userData.avatar || currentUser.avatar || currentUser.image,
      };
      
      console.log('💾 Saving updated user to localStorage');
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      // ✅ Apply theme if changed
      if (userData.theme && userData.theme !== currentUser.theme) {
        console.log('🎨 Applying new theme:', userData.theme);
        applyTheme(userData.theme);
      }
      
      // ✅ Dispatch storage event for other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'user',
        newValue: JSON.stringify(updatedUser),
        url: window.location.href
      }));
      
      console.log('✅ User updated');
      return updatedUser;
    });
    
  }, []);

  // ============================================================================
  // LOGOUT FUNCTION
  // ============================================================================

  const logout = useCallback(async () => {
    console.log('🚪 ===== LOGOUT FUNCTION =====');
    
    // ✅ Clear any pending timeouts
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }
    
    try {
      // ✅ Clear state
      setUser(null);
      setError(null);
      
      console.log('💾 Clearing localStorage');
      
      // ✅ Clear localStorage
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("theme");
      
      console.log('✅ LocalStorage cleared');
      
      // ✅ Disconnect socket
      console.log('🔌 Disconnecting socket');
      disconnectSocket();
      
      // ✅ Notify other tabs
      window.dispatchEvent(new Event('tokenUpdated'));
      
      console.log('✅ Dispatched tokenUpdated event');
      
      // ✅ Firebase sign out
      try {
        await signOut(auth);
        console.log('✅ Firebase sign out successful');
      } catch (firebaseError) {
        console.error("❌ Firebase sign out error:", firebaseError);
        // Don't throw - continue logout even if Firebase fails
      }
      
      console.log('✅ Logout complete\n');
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      setError('Logout failed');
    }
    
  }, []);

  // ============================================================================
  // GOOGLE SIGN IN FUNCTION
  // ============================================================================

  const handlegooglesignin = useCallback(async () => {
    console.log('🔵 ===== GOOGLE SIGN-IN =====');
    
    try {
      setError(null);
      
      console.log('🔵 Opening Google Sign-In popup');
      const result = await signInWithPopup(auth, provider);
      
      const firebaseuser = result.user;
      console.log('✅ Firebase user authenticated:', firebaseuser.email);
      
      // ✅ Prepare payload
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName || firebaseuser.email.split('@')[0],
        image: firebaseuser.photoURL || DEFAULT_AVATAR,
      };
      
      console.log('📤 Sending auth payload to backend');
      
      // ✅ Authenticate with backend
      const response = await axiosInstance.post("/auth/login", payload);
      
      console.log('📥 Backend response received');
      
      // ✅ Extract user data with fallbacks
      const userData = response.data.result || response.data.user || response.data;
      const tokenFromResponse = response.data.token;
      const theme = response.data.theme || userData.theme || null;
      const location = response.data.location || userData.location || null;
      const otpMethod = response.data.otpMethod || userData.preferredOtpMethod || DEFAULT_OTP_METHOD;
      
      if (!tokenFromResponse) {
        console.error('❌ No token in response');
        setError('Server did not return authentication token');
        return;
      }
      
      // ✅ Call login function
      login(userData, tokenFromResponse, theme, location, otpMethod);
      
      console.log('✅ Google Sign-In complete\n');
      
    } catch (error) {
      console.error('❌ Google Sign-In error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      // ✅ Provide specific error messages
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in cancelled.';
      } else if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message;
        
        if (status === 500) {
          errorMessage = 'Server error. Please try again later.';
          console.error('Server logs:', error.response.data);
        } else if (status === 401) {
          errorMessage = 'Invalid credentials. Please try again.';
        } else if (status === 429) {
          errorMessage = 'Too many login attempts. Please try later.';
        } else {
          errorMessage = serverMessage || errorMessage;
        }
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Check your connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      console.error('🚨 Final error message:', errorMessage);
      setError(errorMessage);
      
    }
    
  }, [login]);
  // ============================================================================
  // FIREBASE AUTH STATE OBSERVER - INIT
  // ============================================================================

  useEffect(() => {
    console.log('🔍 ===== AUTH INITIALIZATION =====');
    
    // ✅ Prevent double initialization
    if (hasInitializedRef.current) {
      console.log('✅ Auth already initialized, skipping');
      return;
    }
    
    console.log('🔍 Setting up Firebase auth observer');
    hasInitializedRef.current = true;
    
    // ============================================================================
    // MAIN FIREBASE AUTH LISTENER
    // ============================================================================
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseuser) => {
      console.log('👤 Firebase auth state changed');
      
      if (firebaseuser) {
        console.log('👤 Firebase user detected:', firebaseuser.email);
        
        try {
          // ✅ Check for stored user data
          const storedUser = localStorage.getItem("user");
          const storedToken = localStorage.getItem("token");
          
          if (storedUser && storedToken) {
            console.log('✅ Stored user found, using cached data');
            
            try {
              const parsedUser = JSON.parse(storedUser);
              
              console.log('✅ Parsed stored user:', {
                id: parsedUser._id || parsedUser.id,
                email: parsedUser.email,
              });
              
              setUser(parsedUser);
              setIsInitializing(false);
              console.log('✅ Init complete with cached user\n');
              return;
              
            } catch (parseError) {
              console.error('❌ Failed to parse stored user:', parseError);
              localStorage.removeItem("user");
              localStorage.removeItem("token");
            }
          }
          
          // ✅ No stored data - fetch from backend
          console.log('🔄 No cached data, fetching from backend...');
          
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName || firebaseuser.email.split('@')[0],
            image: firebaseuser.photoURL || DEFAULT_AVATAR,
          };
          
          console.log('📤 Sending auto-login payload');
          
          const response = await axiosInstance.post("/auth/login", payload);
          
          console.log('📥 Backend response received');
          
          const userData = response.data.result || response.data.user || response.data;
          const tokenFromResponse = response.data.token;
          const theme = response.data.theme || userData.theme || null;
          const location = response.data.location || userData.location || null;
          const otpMethod = response.data.otpMethod || userData.preferredOtpMethod || DEFAULT_OTP_METHOD;
          
          if (!tokenFromResponse) {
            console.error('❌ No token in auto-login response');
            await logout();
            setIsInitializing(false);
            return;
          }
          
          console.log('🔐 Calling login with backend data');
          login(userData, tokenFromResponse, theme, location, otpMethod);
          
          console.log('✅ Init complete with backend user\n');
          
        } catch (error) {
          console.error('❌ Auto-login error:', error.message);
          console.error('   Status:', error.response?.status);
          console.error('   Data:', error.response?.data);
          
          await logout();
        }
        
      } else {
        // ✅ No Firebase user
        console.log('👤 No Firebase user');
        
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("token");
        
        if (storedUser && storedToken) {
          console.log('✅ Using stored local user');
          
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            window.dispatchEvent(new Event('tokenUpdated'));
            console.log('✅ Restored local user\n');
            
          } catch (parseError) {
            console.error('❌ Failed to parse stored user:', parseError);
            await logout();
          }
        } else {
          console.log('📭 No stored user, clearing state');
          await logout();
        }
      }
      
      setIsInitializing(false);
      
    });
    
    // ✅ Store unsubscribe function
    authUnsubscribeRef.current = unsubscribe;
    
    // ✅ Cleanup
    return () => {
      console.log('🧹 Cleaning up Firebase auth observer');
      if (authUnsubscribeRef.current) {
        authUnsubscribeRef.current();
        authUnsubscribeRef.current = null;
      }
    };
    
  }, [login, logout]); // ✅ FIXED: Added dependencies
  // ============================================================================
  // STORAGE EVENT LISTENER - SYNC ACROSS TABS
  // ============================================================================

  useEffect(() => {
    console.log('📡 Setting up storage listener for tab sync');
    
    const handleStorageChange = (event) => {
      console.log('📡 Storage event received:', event.key);
      
      if (event.key === 'user' && event.newValue) {
        try {
          const updatedUser = JSON.parse(event.newValue);
          console.log('👤 Syncing user from other tab:', updatedUser.email);
          setUser(updatedUser);
          
        } catch (error) {
          console.error('❌ Failed to parse synced user:', error);
        }
      } else if (event.key === 'user' && !event.newValue) {
        console.log('🚪 User cleared in another tab, logging out');
        setUser(null);
      } else if (event.key === 'token') {
        console.log('🔑 Token updated in another tab');
        window.dispatchEvent(new Event('tokenUpdated'));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      console.log('🧹 Removing storage listener');
      window.removeEventListener('storage', handleStorageChange);
    };
    
  }, []);
  // ============================================================================
  // TOKEN UPDATED LISTENER - GLOBAL SYNC
  // ============================================================================

  useEffect(() => {
    console.log('🔑 Setting up tokenUpdated listener');
    
    const handleTokenUpdated = () => {
      console.log('🔑 Token updated event received');
      
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        try {
          const userData = JSON.parse(userStr);
          console.log('✅ Restoring user after token update:', userData.email);
          setUser(userData);
          
        } catch (error) {
          console.error('❌ Failed to parse user after token update:', error);
        }
      }
    };
    
    window.addEventListener('tokenUpdated', handleTokenUpdated);
    
    return () => {
      console.log('🧹 Removing tokenUpdated listener');
      window.removeEventListener('tokenUpdated', handleTokenUpdated);
    };
    
  }, []);
  // ============================================================================
  // CONTEXT VALUE - MEMOIZED
  // ============================================================================

  const contextValue = useMemo(() => {
    console.log('📦 Creating context value with user:', user?.email || 'none');
    
    return {
      user,
      login,
      logout,
      handlegooglesignin,
      updateUser,
      error,
      isInitializing,
    };
  }, [user, error, isInitializing, login, logout, updateUser]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isInitializing) {
    console.log('⏳ App initializing...');
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500 animate-spin"></div>
          </div>
          
          {/* Text */}
          <div className="text-center">
            <div className="text-white text-lg font-semibold mb-2">
              Initializing...
            </div>
            <div className="text-gray-400 text-sm">
              Setting up your session
            </div>
          </div>
          
          {/* Animated dots */}
          <div className="flex gap-1 mt-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PROVIDER RETURN
  // ============================================================================

  console.log('✅ Rendering UserProvider with user:', user?.email || 'anonymous');

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};
// ============================================================================
// USE USER HOOK
// ============================================================================

export const useUser = () => {
  const context = useContext(UserContext);
  
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
};

// ============================================================================
// EXPORT
// ============================================================================

export default UserProvider;
