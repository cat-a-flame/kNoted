import type { Metadata } from 'next';
import { Lora, DM_Sans } from 'next/font/google';
import './globals.css';

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'kNoted',
  description: 'Your crochet project notebook',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lora.variable} ${dmSans.variable}`}>
      <body className="font-sans bg-bg text-text-primary antialiased">{children}</body>
    </html>
  );
}
