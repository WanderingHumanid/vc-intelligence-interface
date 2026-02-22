import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VC Intelligence Interface',
  description: 'AI-assisted sourcing and enrichment platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className={`${inter.className} flex bg-white text-slate-900 min-h-screen selection:bg-blue-100 selection:text-blue-900`}>
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen">
          <div className="max-w-6xl mx-auto w-full p-8">
            {children}
          </div>
        </main>
        <Toaster />
      </body>
    </html>
  );
}
