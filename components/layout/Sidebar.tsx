'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './Sidebar.module.css';

const navItems = [
  { href: '/projects', label: 'Projects' },
  { href: '/stats', label: 'Statistics' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <Link href="/projects">
          <h1 className={styles.brandTitle}>kNoted</h1>
        </Link>
        <p className={styles.brandSub}>Crochet notebook</p>
      </div>

      <nav className={styles.nav}>
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
      </nav>

      <div className={styles.footer}>
        <button onClick={handleSignOut} className={styles.signOutBtn}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
