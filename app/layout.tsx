import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'roost',
  description: 'A small app for the people you live with.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a0f08',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Favicon — bird perched on a roof. SVG works in all modern browsers
            and scales perfectly to every size. The PNG references are for iOS
            home-screen + Android coverage; if you haven't generated them yet,
            browsers fall back to the SVG silently. */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icon-512.png" type="image/png" sizes="512x512" />

        {/* Fraunces — used for the roost wordmark on the login screen.
            Loaded explicitly so the brand wordmark looks the same to everyone
            regardless of which theme they're using inside the app. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body data-theme="neutral">
        <div className="app-root">{children}</div>
      </body>
    </html>
  );
}
