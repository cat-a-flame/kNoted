'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

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
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-3xl font-bold text-text-primary mb-4">kNoted</h1>
          <div className="bg-teal-light border border-teal/20 rounded-lg p-6">
            <p className="text-sm text-teal-dark font-medium">
              Check your email to confirm your account before signing in.
            </p>
          </div>
          <p className="mt-4 text-sm text-text-secondary">
            <Link href="/login" className="text-teal font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-bold text-text-primary">kNoted</h1>
          <p className="mt-1 text-text-secondary text-sm">Your crochet pattern notebook</p>
        </div>

        <div className="bg-surface rounded-lg border border-black/[0.09] p-6 shadow-sm">
          <h2 className="font-serif text-xl font-semibold text-text-primary mb-5">Create account</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-black/[0.09] rounded-sm px-3 py-2 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-black/[0.09] rounded-sm px-3 py-2 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-1">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-black/[0.09] rounded-sm px-3 py-2 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
              />
            </div>

            {error && (
              <p className="text-sm text-coral bg-coral-light rounded-sm px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal text-white rounded-sm py-2 text-sm font-medium hover:bg-teal-dark transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="text-teal font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
