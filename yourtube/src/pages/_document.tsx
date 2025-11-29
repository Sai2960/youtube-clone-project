import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="YourTube" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="YourTube" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Theme Color - Dynamic based on theme */}
        <meta name="theme-color" content="#0f0f0f" />
        <meta name="msapplication-TileColor" content="#0f0f0f" />
        
        {/* NO VIEWPORT HERE - It's in _app.tsx */}
        
        {/* Fonts - Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" 
          rel="stylesheet" 
        />
        
        {/* External Scripts */}
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
        
        {/* Enhanced Theme Initialization - Prevents flash and hydration issues */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Get stored theme or default to 'dark'
                  const storedTheme = localStorage.getItem('theme');
                  const theme = (storedTheme === 'light' || storedTheme === 'dark') ? storedTheme : 'dark';
                  
                  // Apply theme to HTML element
                  const html = document.documentElement;
                  if (html) {
                    html.classList.remove('light', 'dark');
                    html.classList.add(theme);
                    html.setAttribute('data-theme', theme);
                    
                    // Set background color
                    const bgColor = theme === 'dark' ? '#0f0f0f' : '#ffffff';
                    html.style.backgroundColor = bgColor;
                    
                    // Apply to body if available
                    if (document.body) {
                      document.body.style.backgroundColor = bgColor;
                    }
                    
                    // Update theme-color meta tag
                    const metaTheme = document.querySelector('meta[name="theme-color"]');
                    if (metaTheme) {
                      metaTheme.setAttribute('content', bgColor);
                    }
                  }
                } catch (e) {
                  // Fallback to dark theme on error
                  console.error('Theme initialization error:', e);
                  const html = document.documentElement;
                  if (html) {
                    html.classList.add('dark');
                    html.style.backgroundColor = '#0f0f0f';
                  }
                  if (document.body) {
                    document.body.style.backgroundColor = '#0f0f0f';
                  }
                }
              })();
            `,
          }}
        />
        
        {/* Critical CSS - Mobile Optimizations & Safe Area Support */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Prevent zoom on input focus (iOS Safari) */
            @media (max-width: 768px) {
              input, select, textarea {
                font-size: 16px !important;
              }
            }
            
            /* Prevent horizontal scroll */
            html, body {
              overflow-x: hidden;
              width: 100%;
              position: relative;
              margin: 0;
              padding: 0;
            }
            
            /* Safe area insets for notched devices */
            @supports (padding: max(0px)) {
              body {
                padding-left: max(0px, env(safe-area-inset-left));
                padding-right: max(0px, env(safe-area-inset-right));
                padding-bottom: max(0px, env(safe-area-inset-bottom));
              }
            }
            
            /* Prevent flash of unstyled content - hide until theme is applied */
            html:not(.light):not(.dark) {
              visibility: hidden;
              opacity: 0;
            }
            
            /* Show content once theme is applied */
            html.light,
            html.dark {
              visibility: visible;
              opacity: 1;
              transition: opacity 0.1s ease-in;
            }
            
            /* Smooth background transitions */
            html,
            body {
              transition: background-color 0.2s ease-in-out;
            }
            
            /* Prevent text size adjustment on orientation change (iOS) */
            html {
              -webkit-text-size-adjust: 100%;
              -moz-text-size-adjust: 100%;
              -ms-text-size-adjust: 100%;
              text-size-adjust: 100%;
            }
            
            /* Smooth scrolling */
            html {
              scroll-behavior: smooth;
            }
            
            @media (prefers-reduced-motion: reduce) {
              html {
                scroll-behavior: auto;
              }
              
              *,
              *::before,
              *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
              }
            }
            
            /* Better tap highlight */
            * {
              -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
            }
            
            /* Prevent pull-to-refresh on mobile */
            body {
              overscroll-behavior-y: contain;
            }
          `
        }} />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}