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
