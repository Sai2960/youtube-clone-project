// youtube/src/lib/theme.ts - COMPLETE FIXED VERSION WITH GLOBAL ACCESS

export type Theme = 'light' | 'dark';

/**
 * 🎨 Apply theme to the entire application
 * ✅ CRITICAL: Uses !important and multiple methods to ensure theme applies
 */
export const applyTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return;
  
  console.log('🎨 ===== APPLYING THEME =====');
  console.log('   Requested theme:', theme);
  console.log('   Timestamp:', new Date().toISOString());
  
  const html = document.documentElement;
  const body = document.body;
  
  // ✅ STEP 1: Remove both theme classes
  html.classList.remove('light', 'dark');
  body.classList.remove('light', 'dark');
  console.log('   ✓ Removed old classes');
  
  // ✅ STEP 2: Add new theme class
  html.classList.add(theme);
  body.classList.add(theme);
  console.log('   ✓ Added new class:', theme);
  
  // ✅ STEP 3: Set data attributes
  html.setAttribute('data-theme', theme);
  body.setAttribute('data-theme', theme);
  console.log('   ✓ Set data-theme attribute');
  
  // ✅ STEP 4: Force background colors with !important via inline styles
  const bgColor = theme === 'dark' ? '#0f0f0f' : '#ffffff';
  const textColor = theme === 'dark' ? '#f1f1f1' : '#0f0f0f';
  
  html.style.setProperty('background-color', bgColor, 'important');
  body.style.setProperty('background-color', bgColor, 'important');
  html.style.setProperty('color', textColor, 'important');
  body.style.setProperty('color', textColor, 'important');
  console.log('   ✓ Set inline styles:', { bgColor, textColor });
  
  // ✅ STEP 5: Update CSS variables on :root
  const root = document.documentElement;
  
  if (theme === 'light') {
    // Light theme variables
    root.style.setProperty('--bg-primary', '#ffffff');
    root.style.setProperty('--bg-secondary', '#f9f9f9');
    root.style.setProperty('--bg-tertiary', '#f2f2f2');
    root.style.setProperty('--bg-hover', '#e5e5e5');
    root.style.setProperty('--text-primary', '#0f0f0f');
    root.style.setProperty('--text-secondary', '#606060');
    root.style.setProperty('--text-disabled', '#909090');
    root.style.setProperty('--border-color', '#e5e5e5');
    root.style.setProperty('--divider', '#0000001a');
    
    root.style.setProperty('--background', '#ffffff');
    root.style.setProperty('--foreground', '#0f0f0f');
    root.style.setProperty('--card', '#ffffff');
    root.style.setProperty('--card-foreground', '#0f0f0f');
    root.style.setProperty('--primary', '#065fd4');
    root.style.setProperty('--primary-hover', '#0d7ae8');
    root.style.setProperty('--destructive', '#cc0000');
    root.style.setProperty('--destructive-hover', '#a80000');
    root.style.setProperty('--muted', '#606060');
    root.style.setProperty('--accent', '#f2f2f2');
    
    console.log('   ✓ Set LIGHT theme CSS variables');
  } else {
    // Dark theme variables
    root.style.setProperty('--bg-primary', '#0f0f0f');
    root.style.setProperty('--bg-secondary', '#212121');
    root.style.setProperty('--bg-tertiary', '#272727');
    root.style.setProperty('--bg-hover', '#3f3f3f');
    root.style.setProperty('--text-primary', '#f1f1f1');
    root.style.setProperty('--text-secondary', '#aaaaaa');
    root.style.setProperty('--text-disabled', '#717171');
    root.style.setProperty('--border-color', '#3f3f3f');
    root.style.setProperty('--divider', '#ffffff1a');
    
    root.style.setProperty('--background', '#0f0f0f');
    root.style.setProperty('--foreground', '#f1f1f1');
    root.style.setProperty('--card', '#212121');
    root.style.setProperty('--card-foreground', '#f1f1f1');
    root.style.setProperty('--primary', '#3ea6ff');
    root.style.setProperty('--primary-hover', '#65b8ff');
    root.style.setProperty('--destructive', '#ff0000');
    root.style.setProperty('--destructive-hover', '#cc0000');
    root.style.setProperty('--muted', '#717171');
    root.style.setProperty('--accent', '#3f3f3f');
    
    console.log('   ✓ Set DARK theme CSS variables');
  }
  
  // ✅ STEP 6: Update meta theme-color
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.setAttribute('name', 'theme-color');
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute('content', bgColor);
  console.log('   ✓ Updated meta theme-color');
  
  // ✅ STEP 7: Store in localStorage
  try {
    localStorage.setItem('theme', theme);
    console.log('   ✓ Saved to localStorage');
  } catch (e) {
    console.warn('   ⚠️ Failed to save theme:', e);
  }
  
  // ✅ STEP 8: Force repaint
  void document.body.offsetHeight;
  console.log('   ✓ Forced repaint');
  
  // ✅ STEP 9: Verify application
  const verifyBg = window.getComputedStyle(body).backgroundColor;
  const verifyColor = window.getComputedStyle(body).color;
  
  console.log('🔍 VERIFICATION:');
  console.log('   HTML classes:', Array.from(html.classList));
  console.log('   Body classes:', Array.from(body.classList));
  console.log('   Computed background:', verifyBg);
  console.log('   Computed color:', verifyColor);
  console.log('   --bg-primary:', getComputedStyle(root).getPropertyValue('--bg-primary'));
  console.log('   --text-primary:', getComputedStyle(root).getPropertyValue('--text-primary'));
  
  // Check if theme actually applied
  const expectedBg = theme === 'dark' ? 'rgb(15, 15, 15)' : 'rgb(255, 255, 255)';
  if (verifyBg === expectedBg) {
    console.log('✅ THEME APPLIED SUCCESSFULLY!');
  } else {
    console.error('❌ THEME DID NOT APPLY!');
    console.error('   Expected:', expectedBg);
    console.error('   Got:', verifyBg);
  }
  
  console.log('===== THEME APPLICATION COMPLETE =====\n');
};

/**
 * Get stored theme from localStorage
 */
export const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch (e) {
    console.warn('Failed to read theme:', e);
  }
  
  // Check system preference
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  
  return 'dark';
};

/**
 * Toggle between light and dark theme
 */
export const toggleTheme = (): Theme => {
  const current = getStoredTheme();
  const newTheme: Theme = current === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  return newTheme;
};

/**
 * Initialize theme on app load
 */
export const initializeTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  
  const theme = getStoredTheme();
  console.log('🎨 Initializing theme on app load:', theme);
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
if (typeof window !== 'undefined') {
  (window as any).applyTheme = applyTheme;
  (window as any).getStoredTheme = getStoredTheme;
  (window as any).toggleTheme = toggleTheme;
  console.log('✅ Theme functions exposed globally for debugging');
  console.log('   Try: applyTheme("light") or applyTheme("dark")');
}