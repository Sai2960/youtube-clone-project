// youtube/src/lib/theme.ts - COMPLETE FIXED VERSION WITH GLOBAL ACCESS

export type Theme = "light" | "dark";

/**
 * 🎨 Apply theme to the entire application
 * ✅ CRITICAL: Uses !important and multiple methods to ensure theme applies
 */
export const applyTheme = (theme: Theme, isManualChange = false): void => {
  if (typeof window === "undefined") return;

  console.log("🎨 ===== APPLYING THEME =====");
  console.log("   Requested theme:", theme);
  console.log("   Manual change:", isManualChange);
  console.log("   Timestamp:", new Date().toISOString());

  // ✅ CRITICAL: If this is a manual change, block auto-switching for 24 hours
  if (isManualChange) {
    const blockUntil = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    localStorage.setItem("themeManualOverride", blockUntil.toString());
    console.log("🔒 Manual override set - blocking auto-switch for 24h");
  }

  const html = document.documentElement;
  const body = document.body;

  // Remove both theme classes
  html.classList.remove("light", "dark");
  body.classList.remove("light", "dark");
  console.log("   ✓ Removed old classes");

  // Add new theme class
  html.classList.add(theme);
  body.classList.add(theme);

  const nextRoot = document.getElementById("__next");
  if (nextRoot) {
    nextRoot.classList.remove("light", "dark");
    nextRoot.classList.add(theme);
  }
  console.log("   ✓ Added new class:", theme);

  // Set data attributes
  html.setAttribute("data-theme", theme);
  body.setAttribute("data-theme", theme);
  console.log("   ✓ Set data-theme attribute");

  // Force background colors
  const bgColor = theme === "dark" ? "#0f0f0f" : "#ffffff";
  const textColor = theme === "dark" ? "#f1f1f1" : "#0f0f0f";

  html.style.cssText = `background-color: ${bgColor} !important; color: ${textColor} !important;`;
  body.style.cssText = `background-color: ${bgColor} !important; color: ${textColor} !important;`;

  if (nextRoot) {
    nextRoot.style.cssText = `background-color: ${bgColor} !important; color: ${textColor} !important;`;
  }

  console.log("   ✓ Set inline styles:", { bgColor, textColor });

  // Dispatch theme change event
  window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme } }));

  // Force Tailwind recognition
  requestAnimationFrame(() => {
    document.documentElement.style.colorScheme = theme;
    document.body.style.colorScheme = theme;
  });

  console.log("   ✓ Dispatched theme change event");

  // Update CSS variables
  const root = document.documentElement;

  if (theme === "light") {
    root.style.setProperty("--bg-primary", "#ffffff");
    root.style.setProperty("--bg-secondary", "#f9f9f9");
    root.style.setProperty("--bg-tertiary", "#f2f2f2");
    root.style.setProperty("--bg-hover", "#e5e5e5");
    root.style.setProperty("--text-primary", "#0f0f0f");
    root.style.setProperty("--text-secondary", "#606060");
    root.style.setProperty("--text-disabled", "#909090");
    root.style.setProperty("--border-color", "#e5e5e5");
    root.style.setProperty("--divider", "#0000001a");
    root.style.setProperty("--background", "#ffffff");
    root.style.setProperty("--foreground", "#0f0f0f");
    root.style.setProperty("--card", "#ffffff");
    root.style.setProperty("--card-foreground", "#0f0f0f");
    root.style.setProperty("--primary", "#065fd4");
    root.style.setProperty("--primary-hover", "#0d7ae8");
    root.style.setProperty("--destructive", "#cc0000");
    root.style.setProperty("--destructive-hover", "#a80000");
    root.style.setProperty("--muted", "#606060");
    root.style.setProperty("--accent", "#f2f2f2");
    console.log("   ✓ Set LIGHT theme CSS variables");
  } else {
    root.style.setProperty("--bg-primary", "#0f0f0f");
    root.style.setProperty("--bg-secondary", "#212121");
    root.style.setProperty("--bg-tertiary", "#272727");
    root.style.setProperty("--bg-hover", "#3f3f3f");
    root.style.setProperty("--text-primary", "#f1f1f1");
    root.style.setProperty("--text-secondary", "#aaaaaa");
    root.style.setProperty("--text-disabled", "#717171");
    root.style.setProperty("--border-color", "#3f3f3f");
    root.style.setProperty("--divider", "#ffffff1a");
    root.style.setProperty("--background", "#0f0f0f");
    root.style.setProperty("--foreground", "#f1f1f1");
    root.style.setProperty("--card", "#212121");
    root.style.setProperty("--card-foreground", "#f1f1f1");
    root.style.setProperty("--primary", "#3ea6ff");
    root.style.setProperty("--primary-hover", "#65b8ff");
    root.style.setProperty("--destructive", "#ff0000");
    root.style.setProperty("--destructive-hover", "#cc0000");
    root.style.setProperty("--muted", "#717171");
    root.style.setProperty("--accent", "#3f3f3f");
    console.log("   ✓ Set DARK theme CSS variables");
  }

  // Update meta theme-color
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement("meta");
    metaTheme.setAttribute("name", "theme-color");
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute("content", bgColor);
  console.log("   ✓ Updated meta theme-color");

  // Store in localStorage
  try {
    localStorage.setItem("theme", theme);
    console.log("   ✓ Saved to localStorage");
  } catch (e) {
    console.warn("   ⚠️ Failed to save theme:", e);
  }

  // Force repaints
  void document.body.offsetHeight;
  void document.documentElement.offsetHeight;
  if (nextRoot) void nextRoot.offsetHeight;
  console.log("   ✓ Forced repaint");

  console.log("===== THEME APPLICATION COMPLETE =====\n");
};
/**
 * Get stored theme from localStorage
 */
export const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";

  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch (e) {
    console.warn("Failed to read theme:", e);
  }

  // Check system preference
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
    return "light";
  }

  return "dark";
};

/**
 * Toggle between light and dark theme
 */
export const toggleTheme = (): Theme => {
  const current = getStoredTheme();
  const newTheme: Theme = current === "dark" ? "light" : "dark";
  applyTheme(newTheme, true); // ✅ Mark as manual change
  return newTheme;
};

/**
 * Initialize theme on app load
 */
export const initializeTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";

  // ✅ CRITICAL: Check URL params for theme (from login redirect)
  const urlParams = new URLSearchParams(window.location.search);
  const urlTheme = urlParams.get("theme") as Theme;

  if (urlTheme === "light" || urlTheme === "dark") {
    console.log("🎨 Theme from URL:", urlTheme);
    applyTheme(urlTheme);
    return urlTheme;
  }

  const theme = getStoredTheme();
  console.log("🎨 Initializing theme on app load:", theme);
  applyTheme(theme);
  return theme;
};

/**
 * Set and apply theme (alias for applyTheme)
 */
export const setStoredTheme = (theme: Theme): void => {
  applyTheme(theme);
};

// ✅ CRITICAL: Make applyTheme globally accessible for debugging
if (typeof window !== "undefined") {
  (window as any).applyTheme = applyTheme;
  (window as any).getStoredTheme = getStoredTheme;
  (window as any).toggleTheme = toggleTheme;
  console.log("✅ Theme functions exposed globally for debugging");
  console.log('   Try: applyTheme("light") or applyTheme("dark")');
}
