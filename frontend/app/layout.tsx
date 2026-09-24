import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Source_Serif_4, Inter, Geist } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import FloatingThemeToggle from '@/components/floating-theme-toggle'
import './globals.css'
import { cn } from "@/lib/utils";

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
})

const geist = Geist({subsets:['latin'],variable:'--font-sans'})

export const metadata = {
  verification: {
    google: "pXhPc7pZ99SO53K8YiQeaL6IRPYAAg18wZxNZdYickE",
  },
};

export const metadata: Metadata = {
  title: 'IIT Kanpur Research Wing',
  description: 'Explore cutting-edge research initiatives at Indian Institute of Technology Kanpur',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6E1423' },
    { media: '(prefers-color-scheme: dark)', color: '#6E1423' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn(sourceSerif.variable, "font-sans", geist.variable)}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
          <FloatingThemeToggle />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
