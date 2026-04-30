import type { Metadata } from 'next';
import { Lora, Figtree } from 'next/font/google';
import './globals.css';

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
});

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'kNoted',
  description: 'Your crochet project notebook',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lora.variable} ${figtree.variable}`}>
      <body className="font-sans bg-bg text-text-primary antialiased">{children}</body>
    </html>
  );
}
