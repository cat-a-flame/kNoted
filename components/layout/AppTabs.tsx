'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './AppTabs.module.css';

const TABS = [
  { href: '/patterns', label: 'Patterns' },
  { href: '/yarns', label: 'Yarns' },
];

function UserMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div ref={ref} className={styles.userMenu}>
      <button onClick={() => setOpen((v) => !v)} className={styles.avatar} aria-label="Account menu" aria-expanded={open}>
        {email ? email[0].toUpperCase() : ''}
      </button>
      {open && (
        <div className={styles.dropdown}>
          {email && <p className={styles.dropdownEmail}>{email}</p>}
          <Link href="/account" className={styles.dropdownItem} onClick={() => setOpen(false)}>Account settings</Link>
          <button onClick={handleSignOut} className={styles.dropdownItem}>Sign out</button>
        </div>
      )}
    </div>
  );
}

export function AppTabs() {
  const pathname = usePathname();

  return (
    <div className={styles.bar}>
      <nav className={styles.tabs}>
        {TABS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={`${styles.tab} ${active ? styles.tabActive : ''}`} aria-current={active ? 'page' : undefined}>
              {label}
            </Link>
          );
        })}
      </nav>
      <UserMenu />
    </div>
  );
}
