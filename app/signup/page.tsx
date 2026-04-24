'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import loginStyles from '../login/page.module.css';
import styles from './page.module.css';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className={loginStyles.page}>
        <div className={loginStyles.container} style={{ textAlign: 'center' }}>
          <h1 className={loginStyles.brandTitle} style={{ marginBottom: '1rem' }}>kNoted</h1>
          <div className={styles.successCard}>
            <p className={styles.successText}>
              Check your email to confirm your account before signing in.
            </p>
          </div>
          <p className={loginStyles.footer} style={{ marginTop: '1rem' }}>
            <Link href="/login" className={loginStyles.footerLink}>Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={loginStyles.page}>
      <div className={loginStyles.container}>
        <div className={loginStyles.brand}>
          <h1 className={loginStyles.brandTitle}>kNoted</h1>
          <p className={loginStyles.brandSub}>Your crochet project notebook</p>
        </div>

        <div className={loginStyles.card}>
          <h2 className={loginStyles.cardTitle}>Create account</h2>

          <form onSubmit={handleSubmit} className={loginStyles.form}>
            <div className={loginStyles.field}>
              <FormLabel htmlFor="email">Email</FormLabel>
              <Input id="email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className={loginStyles.field}>
              <FormLabel htmlFor="password">Password</FormLabel>
              <Input id="password" type="password" required autoComplete="new-password"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className={loginStyles.field}>
              <FormLabel htmlFor="confirmPassword">Confirm password</FormLabel>
              <Input id="confirmPassword" type="password" required autoComplete="new-password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>

            {error && <p className={loginStyles.errorMsg}>{error}</p>}

            <button type="submit" disabled={loading} className={loginStyles.submitBtn}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className={loginStyles.footer}>
          Already have an account?{' '}
          <Link href="/login" className={loginStyles.footerLink}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
