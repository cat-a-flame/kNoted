import type { Metadata } from 'next';
import { Fredoka, Karla } from 'next/font/google';
import './globals.css';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
});

const karla = Karla({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-karla',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'kNoted',
  description: 'Your crochet companion — patterns, stitch counter and yarn stash',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${karla.variable}`}>
      <body>{children}</body>
    </html>
  );
}
