'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './AppHeader.module.css';

const navItems = [
  { href: '/projects', label: 'Projects' },
  { href: '/stats', label: 'Statistics' },
];

function UserMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '');
    });
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
      <button
        onClick={() => setOpen((v) => !v)}
        className={styles.avatarBtn}
        aria-label="User menu"
        aria-expanded={open}
      >
        <span className={styles.avatar}>{email ? email[0].toUpperCase() : '?'}</span>
      </button>
      {open && (
        <div className={styles.dropdown}>
          {email && <p className={styles.dropdownEmail}>{email}</p>}
          <Link href="/account" className={styles.dropdownItem} onClick={() => setOpen(false)}>
            Account settings
          </Link>
          <button onClick={handleSignOut} className={styles.signOutItem}>Sign out</button>
        </div>
      )}
    </div>
  );
}

export function AppHeader() {
  const pathname = usePathname();

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/projects" className={styles.brand}>kNoted</Link>
          <div className={styles.headerRight}>
            <UserMenu />
          </div>
        </div>
      </header>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          {navItems.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
