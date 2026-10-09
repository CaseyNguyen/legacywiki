import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/libertinus-serif/latin-400.css';
import '@fontsource/libertinus-serif/latin-400-italic.css';
import '@fontsource/libertinus-serif/latin-600.css';
import '@fontsource/barlow-semi-condensed/latin-500.css';
import '@fontsource/barlow-semi-condensed/latin-600.css';
import '@fontsource/barlow-semi-condensed/latin-700.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'LegacyWiki', template: '%s · LegacyWiki' },
  description: 'A Wikipedia-style encyclopedia of your Sleeper fantasy football league.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#121822',
};

// Applies a saved light/dark choice before first paint (no flash).
const themeScript = `try{var t=localStorage.getItem('legacywiki:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
