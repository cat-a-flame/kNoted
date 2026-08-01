'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

const PUBLIC_PATHS = ['/login'];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setReady(true);
  }), []);

  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!ready) return;
    if (!user && !isPublic) router.replace('/login');
    if (user && isPublic) router.replace('/projects');
  }, [ready, user, isPublic, router]);

  if (!ready) return null;
  if (!user && !isPublic) return null;
  if (user && isPublic) return null;

  return <>{children}</>;
}
