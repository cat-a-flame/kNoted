'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/projects', label: 'Projects' },
  { href: '/stats', label: 'Statistics' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-black/[0.09] flex">
      {navItems.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 py-3 text-xs font-medium text-center transition-colors ${
              active ? 'text-teal' : 'text-text-tertiary'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
