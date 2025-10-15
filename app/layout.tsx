import './globals.css';
import type { Metadata, Viewport } from 'next';
import PWAClient from '@/components/PWAClient';

export const metadata: Metadata = {
  title: 'Travel Guide - ไกด์ท่องเที่ยว',
  description: 'Checklist, expenses and itinerary planner',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#111827',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="bg-white min-h-full">
        <PWAClient />
        {children}
      </body>
    </html>
  );
}
