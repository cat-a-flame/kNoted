'use client';

import { useState, useEffect, FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { Input } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import { Toast } from '@/components/ui/Toast';
import styles from './page.module.css';

export default function AccountPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '');
      setUsername(data.user?.user_metadata?.username ?? '');
    });
  }, []);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setUsernameLoading(true);
    const { error } = await createClient().auth.updateUser({ data: { username: username.trim() } });
    setUsernameLoading(false);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setToast({ message: 'Profile updated.', variant: 'success' });
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToast({ message: 'New passwords do not match.', variant: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters.', variant: 'error' });
      return;
    }
    setPasswordLoading(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) {
      setPasswordLoading(false);
      setToast({ message: 'Current password is incorrect.', variant: 'error' });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setToast({ message: 'Password updated.', variant: 'success' });
  };

  return (
    <div className="appShell">
      <AppHeader />

      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>Account settings</h1>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Profile</h2>
            <form onSubmit={handleUpdateProfile} className={styles.form}>
              <div className={styles.field}>
                <FormLabel htmlFor="email">Email</FormLabel>
                <Input id="email" value={email} disabled />
              </div>
              <div className={styles.field}>
                <FormLabel htmlFor="username">Username</FormLabel>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. yarn_lover"
                  autoComplete="username"
                />
              </div>
              <button type="submit" disabled={usernameLoading} className={styles.saveBtn}>
                {usernameLoading ? 'Saving…' : 'Save profile'}
              </button>
            </form>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Change password</h2>
            <form onSubmit={handleChangePassword} className={styles.form}>
              <div className={styles.field}>
                <FormLabel htmlFor="currentPassword">Current password</FormLabel>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className={styles.field}>
                <FormLabel htmlFor="newPassword">New password</FormLabel>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className={styles.field}>
                <FormLabel htmlFor="confirmPassword">Confirm new password</FormLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                className={styles.saveBtn}
              >
                {passwordLoading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </section>
        </div>
      </main>

      <AppFooter />

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </div>
  );
}
