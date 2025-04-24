import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Suspense } from 'react'; // Import Suspense
import './globals.css';
import { Providers } from "@/components/providers"; // Import the new Providers component
import { metadata } from '@/metadata';
import { Loader2 } from 'lucide-react'; // Import Loader2 for fallback

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers> {/* Use the Providers component */}
          {/* Wrap children (page content) in Suspense */}
          <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }>
            {children}
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
