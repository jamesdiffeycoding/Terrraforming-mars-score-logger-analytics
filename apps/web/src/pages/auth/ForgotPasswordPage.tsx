import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [stage, setStage] = useState<'request' | 'reset'>('request');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setSubmitting(false);
    setStage('reset');
    toast.info('If that email exists, a reset code was sent.');
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) { toast.error('Code must be exactly 6 digits'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/confirm-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? 'Reset failed');
      }
      toast.success('Password reset. You can now sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            {stage === 'request'
              ? 'Enter your email to receive a reset code.'
              : `Enter the code sent to ${email}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stage === 'request' ? (
            <form onSubmit={handleRequest} className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="fp-email">Email</label>
                <input
                  id="fp-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none focus-visible:ring-2"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send reset code'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="underline underline-offset-4">Back to sign in</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleReset} className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="fp-code">Reset code</label>
                <input
                  id="fp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none focus-visible:ring-2"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="fp-password">New password</label>
                <input
                  id="fp-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none focus-visible:ring-2"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Resetting…' : 'Reset password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
