'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './MobileNav.module.css';

const navItems = [
  { href: '/projects', label: 'Projects' },
  { href: '/stats', label: 'Statistics' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {navItems.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={`${styles.link} ${active ? styles.linkActive : ''}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
