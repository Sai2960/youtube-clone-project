import { Html, Head, Main, NextScript, DocumentProps } from "next/document";
import Document from "next/document";

export default function CustomDocument() {
  return (
    <Html lang="en" className="dark">
      <Head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="YourTube" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="YourTube" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Theme Color - Dynamic based on theme */}
        <meta name="theme-color" content="#0f0f0f" />
        <meta name="msapplication-TileColor" content="#0f0f0f" />

        <meta
          httpEquiv="Cache-Control"
          content="no-cache, no-store, must-revalidate, max-age=0"
        />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />

        {/* NO VIEWPORT HERE - It's in _app.tsx */}

        {/* Fonts - Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap"
          rel="stylesheet"
        />

        {/* External Scripts */}
        <script
          src="https://checkout.razorpay.com/v1/checkout.js"
          async
        ></script>

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
        <style
          dangerouslySetInnerHTML={{
            __html: `
            /* ============================================================================
               BASE STYLES & MOBILE OPTIMIZATIONS
               ============================================================================ */
            
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
            
            /* ============================================================================
               FOUC PREVENTION - THEME LOADING
               ============================================================================ */
            
            /* ✅ CHANGED: Don't hide shorts page */
            html:not(.light):not(.dark):not([data-page="shorts"]) {
              visibility: hidden;
              opacity: 0;
            }

            /* ✅ CRITICAL: Always show shorts page immediately */
            html[data-page="shorts"],
            html[data-page="shorts"] body,
            html[data-page="shorts"] #__next {
              visibility: visible !important;
              opacity: 1 !important;
              display: block !important;
            }

            /* Show content once theme is applied */
            html.light,
            html.dark {
              visibility: visible;
              opacity: 1;
              transition: opacity 0.1s ease-in;
            }
            
            /* ============================================================================
               🔴 MOBILE VIDEO RENDERING FIX FOR SHORTS
               ============================================================================ */
            
            @media (max-width: 768px) {
              /* ✅ Shorts page container - fixed fullscreen */
              [data-page="shorts"] {
                position: fixed !important;
                inset: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                height: -webkit-fill-available !important;
                background: #000 !important;
                visibility: visible !important;
                opacity: 1 !important;
                display: block !important;
                overflow: hidden !important;
              }
              
              /* ✅ HTML element on shorts - enable interactions */
              html[data-page="shorts"] {
                background: #000 !important;
                overflow: hidden !important;
                position: relative !important;
              }
              
              /* ✅ Body transparent to let video show through */
              html[data-page="shorts"] body {
                background: transparent !important;
                position: relative !important;
                overflow: hidden !important;
              }
              
              /* ✅ Next.js container - enable interactions */
              html[data-page="shorts"] #__next {
                position: relative !important;
                z-index: 1 !important;
                overflow: hidden !important;
              }
              
              /* ✅ Short player container */
              [data-component="short-player"] {
                position: fixed !important;
                inset: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                visibility: visible !important;
                opacity: 1 !important;
                display: block !important;
                z-index: 30 !important;
              }
              
              /* ✅ CRITICAL: Video element - must be visible */
              [data-component="short-player"] video {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                z-index: 1 !important;
                pointer-events: auto !important;
                /* Force GPU acceleration */
                -webkit-transform: translate3d(0, 0, 0) !important;
                transform: translate3d(0, 0, 0) !important;
                -webkit-backface-visibility: hidden !important;
                backface-visibility: hidden !important;
                /* Prevent iOS black screen bug */
                -webkit-mask-image: -webkit-radial-gradient(white, black) !important;
              }
              
              /* ✅ Force active short visibility */
              [data-is-active="true"] {
                visibility: visible !important;
                opacity: 1 !important;
                display: block !important;
                z-index: 30 !important;
              }
              
              [data-is-active="true"] video {
                visibility: visible !important;
                opacity: 1 !important;
                display: block !important;
              }
              
              /* ✅ Remove any transforms that might hide video */
              [data-is-active="false"] {
                transform: translateY(100vh) !important;
              }
              
              /* Prevent iOS video native controls from showing */
              video::-webkit-media-controls-start-playback-button {
                display: none !important;
              }
              
              video::-webkit-media-controls-play-button {
                display: none !important;
              }
            }
            
            /* ============================================================================
               GENERAL UI ENHANCEMENTS
               ============================================================================ */
            
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
            
            /* Respect user's motion preferences */
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
          `,
          }}
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}