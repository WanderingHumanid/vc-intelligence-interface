import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

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
      <body className={`${outfit.variable} font-sans antialiased text-slate-900 bg-white dark:bg-slate-950 dark:text-slate-50`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 lg:pl-64">
              <div className="max-w-6xl mx-auto p-4 md:p-8">
                {children}
              </div>
            </main>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
