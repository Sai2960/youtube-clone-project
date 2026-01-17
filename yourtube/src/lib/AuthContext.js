// lib/AuthContext.tsx - FIXED VERSION

import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  useState,
  createContext,
  useEffect,
  useContext,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { applyTheme } from "./theme";
import { disconnectSocket } from "./socket";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_AVATAR = "/images/default-avatar.png";
const DEFAULT_THEME = "dark";
const DEFAULT_OTP_METHOD = "sms";

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
  // LOGIN FUNCTION
  // ============================================================================

  const login = useCallback(
    (
      userdata,
      token,
      theme = null,
      location = null,
      otpMethod = DEFAULT_OTP_METHOD,
    ) => {
      console.log("🔐 ===== LOGIN FUNCTION =====");
      console.log("📦 User data:", {
        id: userdata._id || userdata.id,
        email: userdata.email,
        name: userdata.name,
        hasImage: !!userdata.image,
      });
      console.log(
        "🔑 Token received:",
        token ? `Yes (${token.length} chars)` : "NO TOKEN!",
      );

      // ✅ CRITICAL: Validate required data
      if (!token) {
        console.error("❌ CRITICAL: No token provided!");
        setError("Authentication failed - no token received");
        return;
      }

      if (!userdata._id && !userdata.id) {
        console.error("❌ CRITICAL: No user ID!");
        setError("Authentication failed - invalid user data");
        return;
      }

      // ✅ Build enriched user object with all necessary fields
      const enrichedUser = {
        ...userdata,
        _id: userdata._id || userdata.id,
        id: userdata._id || userdata.id,
        image: userdata.image || userdata.avatar || DEFAULT_AVATAR,
        avatar: userdata.image || userdata.avatar || DEFAULT_AVATAR,
        theme:
          theme ||
          userdata.theme ||
          localStorage.getItem("theme") ||
          DEFAULT_THEME,
        location: location || userdata.location || null,
        preferredOtpMethod: otpMethod || DEFAULT_OTP_METHOD,
        loginTime: new Date().toISOString(),
      };

      console.log("💾 Saving enriched user to localStorage");

      try {
        // ✅ Save user FIRST
        localStorage.setItem("user", JSON.stringify(enrichedUser));

        // ✅ Save token SECOND
        localStorage.setItem("token", token);

        // ✅ Update state THIRD
        setUser(enrichedUser);

        console.log("✅ LocalStorage updated successfully");
        console.log("✅ User state updated");
      } catch (storageError) {
        console.error("❌ Storage error:", storageError);
        setError("Failed to save user data");
        return;
      }

      console.log("✅ Login complete\n");

      // ✅ Apply theme if provided
      if (theme || userdata.theme) {
        const themeToApply = theme || userdata.theme || DEFAULT_THEME;
        console.log("🎨 Applying theme:", themeToApply);
        applyTheme(themeToApply);
      }

      // ✅ Notify other tabs
      window.dispatchEvent(new Event("tokenUpdated"));

      // ✅ Dispatch avatar update event for all components
      window.dispatchEvent(new Event("avatarUpdated"));

      // ✅ Clear any previous errors
      setError(null);
    },
    [],
  );

  // ============================================================================
  // UPDATE USER FUNCTION
  // ============================================================================

  const updateUser = useCallback((userData) => {
    console.log("🔄 Updating user data with:", {
      id: userData._id || userData.id,
      email: userData.email,
      hasImage: !!userData.image,
    });

    setUser((currentUser) => {
      if (!currentUser) {
        console.error("❌ No current user to update");
        return currentUser;
      }

      const updatedUser = {
        ...currentUser,
        ...userData,
        _id: userData._id || currentUser._id,
        id: userData._id || currentUser.id || currentUser._id,
        email: userData.email || currentUser.email,
        image: userData.image || currentUser.image,
        avatar:
          userData.image ||
          userData.avatar ||
          currentUser.avatar ||
          currentUser.image,
      };

      console.log("💾 Saving updated user to localStorage");
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // ✅ Apply theme if changed
      if (userData.theme && userData.theme !== currentUser.theme) {
        console.log("🎨 Applying new theme:", userData.theme);
        applyTheme(userData.theme);
      }

      // ✅ Dispatch storage event for other tabs
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "user",
          newValue: JSON.stringify(updatedUser),
          url: window.location.href,
        }),
      );

      // ✅ Dispatch avatar update event
      if (userData.image || userData.avatar) {
        window.dispatchEvent(new Event("avatarUpdated"));
      }

      console.log("✅ User updated");
      return updatedUser;
    });
  }, []);

  // ============================================================================
  // LOGOUT FUNCTION
  // ============================================================================

  const logout = useCallback(async () => {
    console.log("🚪 ===== LOGOUT FUNCTION =====");

    // ✅ Clear any pending timeouts
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }

    try {
      // ✅ Clear state
      setUser(null);
      setError(null);

      console.log("💾 Clearing localStorage");

      // ✅ Clear localStorage
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("theme");

      console.log("✅ LocalStorage cleared");

      // ✅ Disconnect socket
      console.log("🔌 Disconnecting socket");
      disconnectSocket();

      // ✅ Notify other tabs
      window.dispatchEvent(new Event("tokenUpdated"));

      console.log("✅ Dispatched tokenUpdated event");

      // ✅ Firebase sign out
      try {
        await signOut(auth);
        console.log("✅ Firebase sign out successful");
      } catch (firebaseError) {
        console.error("❌ Firebase sign out error:", firebaseError);
      }

      console.log("✅ Logout complete\n");
    } catch (error) {
      console.error("❌ Logout error:", error);
      setError("Logout failed");
    }
  }, []);

  // ============================================================================
  // GOOGLE SIGN IN FUNCTION
  // ============================================================================

  const handlegooglesignin = useCallback(async () => {
    console.log("🔵 ===== GOOGLE SIGN-IN =====");

    try {
      setError(null);

      console.log("🔵 Opening Google Sign-In popup");
      const result = await signInWithPopup(auth, provider);

      const firebaseuser = result.user;
      console.log("✅ Firebase user authenticated:", firebaseuser.email);

      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName || firebaseuser.email.split("@")[0],
        image: firebaseuser.photoURL || DEFAULT_AVATAR,
      };

      console.log("📤 Sending auth payload to backend");

      const response = await axiosInstance.post("/auth/login", payload);

      console.log("📥 Backend response received");

      const userData =
        response.data.result || response.data.user || response.data;
      const tokenFromResponse = response.data.token;
      const theme = response.data.theme || userData.theme || null;
      const location = response.data.location || userData.location || null;
      const otpMethod =
        response.data.otpMethod ||
        userData.preferredOtpMethod ||
        DEFAULT_OTP_METHOD;

      if (!tokenFromResponse) {
        console.error("❌ No token in response");
        setError("Server did not return authentication token");
        return;
      }

      login(userData, tokenFromResponse, theme, location, otpMethod);

      console.log("✅ Google Sign-In complete\n");
    } catch (error) {
      console.error("❌ Google Sign-In error:", error);

      let errorMessage = "Login failed. Please try again.";

      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in cancelled.";
      } else if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message;

        // ============ ADMIN APPROVAL CHECK ============
        if (status === 403) {
          if (
            serverMessage?.includes("pending admin approval") ||
            error.response.data?.status === "pending_approval"
          ) {
            errorMessage =
              "⏳ Your account is pending admin approval. Please wait for an administrator to approve your account.";
          } else {
            errorMessage = serverMessage || "Access denied";
          }
        }
        // =============================================
        else if (status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else if (status === 401) {
          errorMessage = "Invalid credentials. Please try again.";
        } else if (status === 429) {
          errorMessage = "Too many login attempts. Please try later.";
        } else {
          errorMessage = serverMessage || errorMessage;
        }
      } else if (error.request) {
        errorMessage = "Cannot connect to server. Check your connection.";
      } else {
        errorMessage = error.message || errorMessage;
      }

      setError(errorMessage);
    }
  }, [login]);

  // ============================================================================
  // FIREBASE AUTH STATE OBSERVER
  // ============================================================================

  useEffect(() => {
    console.log("🔍 ===== AUTH INITIALIZATION =====");

    if (hasInitializedRef.current) {
      console.log("✅ Auth already initialized, skipping");
      return;
    }

    console.log("🔍 Setting up Firebase auth observer");
    hasInitializedRef.current = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseuser) => {
      console.log("👤 Firebase auth state changed");

      if (firebaseuser) {
        console.log("👤 Firebase user detected:", firebaseuser.email);

        try {
          const storedUser = localStorage.getItem("user");
          const storedToken = localStorage.getItem("token");

          if (storedUser && storedToken) {
            console.log("✅ Stored user found, using cached data");

            try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
              setIsInitializing(false);
              return;
            } catch (parseError) {
              console.error("❌ Failed to parse stored user:", parseError);
              localStorage.removeItem("user");
              localStorage.removeItem("token");
            }
          }

          console.log("🔄 No cached data, fetching from backend...");

          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName || firebaseuser.email.split("@")[0],
            image: firebaseuser.photoURL || DEFAULT_AVATAR,
          };

          const response = await axiosInstance.post("/auth/login", payload);

          const userData =
            response.data.result || response.data.user || response.data;
          const tokenFromResponse = response.data.token;
          const theme = response.data.theme || userData.theme || null;
          const location = response.data.location || userData.location || null;
          const otpMethod =
            response.data.otpMethod ||
            userData.preferredOtpMethod ||
            DEFAULT_OTP_METHOD;

          if (!tokenFromResponse) {
            console.error("❌ No token in auto-login response");
            await logout();
            setIsInitializing(false);
            return;
          }

          login(userData, tokenFromResponse, theme, location, otpMethod);
        } catch (error) {
          console.error("❌ Auto-login error:", error);

          // ============ HANDLE APPROVAL REJECTION ============
          if (error.response?.status === 403) {
            console.log("⏳ Account pending approval");
            setError("Your account is pending admin approval");
            // Don't logout - just stop initialization
            setIsInitializing(false);
            return;
          }
          // ==================================================

          await logout();
        }
      }

      setIsInitializing(false);
    });

    authUnsubscribeRef.current = unsubscribe;

    return () => {
      if (authUnsubscribeRef.current) {
        authUnsubscribeRef.current();
      }
    };
  }, [login, logout]);

  // ============================================================================
  // STORAGE EVENT LISTENER - ENHANCED FOR OTP
  // ============================================================================

  useEffect(() => {
    const handleStorageChange = (event) => {
      console.log("💾 Storage event detected:", event?.key);

      // ✅ Handle user data changes
      if (event?.key === "user" && event.newValue) {
        try {
          const updatedUser = JSON.parse(event.newValue);
          console.log("✅ User synced from storage:", updatedUser.email);
          setUser(updatedUser);
        } catch (error) {
          console.error("❌ Failed to parse synced user:", error);
        }
      }
      // ✅ Handle user logout
      else if (event?.key === "user" && !event.newValue) {
        console.log("🚪 User cleared from storage");
        setUser(null);
      }
      // ✅ Handle token changes
      else if (event?.key === "token") {
        console.log("🔑 Token updated");
        window.dispatchEvent(new Event("tokenUpdated"));
      }
      // ✅ NEW: Handle manual storage events (for OTP login)
      else if (!event?.key) {
        console.log("📢 Manual storage event - checking for user data");
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");

        if (token && userStr) {
          try {
            const userData = JSON.parse(userStr);
            console.log("✅ Loading user from manual event:", userData.email);
            setUser(userData);
          } catch (error) {
            console.error("❌ Failed to parse user from manual event:", error);
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // ✅ CRITICAL: Also check on mount
    const checkStorageOnMount = () => {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (token && userStr && !user) {
        try {
          const userData = JSON.parse(userStr);
          console.log("✅ Found stored user on mount:", userData.email);
          setUser(userData);
        } catch (error) {
          console.error("❌ Failed to parse stored user on mount:", error);
        }
      }
    };

    checkStorageOnMount();

    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user]); // ✅ Added dependency

  // ============================================================================
  // TOKEN UPDATED LISTENER
  // ============================================================================

  useEffect(() => {
    const handleTokenUpdated = () => {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (token && userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
        } catch (error) {
          console.error("❌ Failed to parse user after token update:", error);
        }
      }
    };

    window.addEventListener("tokenUpdated", handleTokenUpdated);
    return () => window.removeEventListener("tokenUpdated", handleTokenUpdated);
  }, []);

  // ============================================================================
  // 🆕 THEME CHANGE LISTENER - REPLACE LINES 453-482 in AuthContext.tsx
  // ============================================================================

  useEffect(() => {
    const handleThemeChange = (event) => {
      const customEvent = event;
      const newTheme = customEvent.detail?.theme;

      if (!newTheme) return;

      console.log("🎨 Theme change event received in AuthContext:", newTheme);

      // Update user with new theme
      if (user) {
        console.log("👤 Syncing theme to user state");
        setUser((currentUser) => {
          if (!currentUser) return currentUser;

          const updatedUser = {
            ...currentUser,
            theme: newTheme,
          };

          // Save to localStorage
          try {
            localStorage.setItem("user", JSON.stringify(updatedUser));
          } catch (error) {
            console.error("Failed to save user theme:", error);
          }

          return updatedUser;
        });
      }
    };

    window.addEventListener("themeChanged", handleThemeChange);

    return () => {
      window.removeEventListener("themeChanged", handleThemeChange);
    };
  }, [user]);
  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue = useMemo(
    () => ({
      user,
      login,
      logout,
      handlegooglesignin,
      updateUser,
      error,
      isInitializing,
    }),
    [
      user,
      error,
      isInitializing,
      login,
      logout,
      updateUser,
      handlegooglesignin,
    ],
  );

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500 animate-spin"></div>
          </div>
          <div className="text-center">
            <div className="text-white text-lg font-semibold mb-2">
              Initializing...
            </div>
            <div className="text-gray-400 text-sm">Setting up your session</div>
          </div>
          <div className="flex gap-1 mt-2">
            <div
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "0s" }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};

// ============================================================================
// USE USER HOOK
// ============================================================================

export const useUser = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
};

export default UserProvider;
