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
        
        {/* Theme Color */}
        <meta name="theme-color" content="#0f0f0f" />
        <meta name="msapplication-TileColor" content="#0f0f0f" />
        
        {/* NO VIEWPORT HERE - It's in _app.tsx */}
        
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" 
          rel="stylesheet" 
        />
        
        {/* External Scripts */}
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
        
        {/* Theme Initialization */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storedTheme = localStorage.getItem('theme');
                  const theme = (storedTheme === 'light' || storedTheme === 'dark') ? storedTheme : 'dark';
                  
                  const html = document.documentElement;
                  html.classList.remove('light', 'dark');
                  html.classList.add(theme);
                  html.setAttribute('data-theme', theme);
                  
                  const bgColor = theme === 'dark' ? '#0f0f0f' : '#ffffff';
                  html.style.backgroundColor = bgColor;
                  document.body.style.backgroundColor = bgColor;
                  
                  const metaTheme = document.querySelector('meta[name="theme-color"]');
                  if (metaTheme) {
                    metaTheme.setAttribute('content', bgColor);
                  }
                } catch (e) {
                  console.error('Theme initialization error:', e);
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.backgroundColor = '#0f0f0f';
                  document.body.style.backgroundColor = '#0f0f0f';
                }
              })();
            `,
          }}
        />
        
        {/* Mobile Optimizations */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 768px) {
              input, select, textarea {
                font-size: 16px !important;
              }
            }
            
            html, body {
              overflow-x: hidden;
              width: 100%;
              position: relative;
            }
            
            @supports (padding: max(0px)) {
              body {
                padding-left: max(0px, env(safe-area-inset-left));
                padding-right: max(0px, env(safe-area-inset-right));
              }
            }
            
            html:not(.light):not(.dark) {
              visibility: hidden;
            }
            
            html.light,
            html.dark {
              visibility: visible;
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