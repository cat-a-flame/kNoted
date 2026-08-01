'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Input } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/projects');
    } catch {
      setError('Incorrect email or password.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <h1 className={styles.brandTitle}>kNoted</h1>
          <p className={styles.brandSub}>Your crochet project notebook</p>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Sign in</h2>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <FormLabel htmlFor="email">Email</FormLabel>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <FormLabel htmlFor="password">Password</FormLabel>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
