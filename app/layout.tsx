import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Navigation } from '@/components/navigation'
import { Toaster } from 'sonner' // Your toast notifications

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Onlee Agency Finance Tracker',
  description: 'Internal financial management and cash flow tracking.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 min-h-screen flex flex-col`}>
        {/* Global Navigation goes here */}
        <Navigation />
        
        {/* Main page content renders here */}
        <main className="flex-1">
          {children}
        </main>
        
        {/* Global Toast provider */}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}