'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
    <aside
      className="hidden md:flex flex-col h-screen sticky top-0 bg-surface border-r border-black/[0.09]"
      style={{ width: '244px', minWidth: '244px' }}
    >
      <div className="px-5 pt-6 pb-4 border-b border-black/[0.09]">
        <Link href="/projects">
          <h1 className="font-serif text-2xl font-bold text-text-primary">kNoted</h1>
        </Link>
        <p className="text-xs text-text-tertiary mt-0.5">Crochet notebook</p>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {navItems.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-teal-light text-teal-dark'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-5">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
