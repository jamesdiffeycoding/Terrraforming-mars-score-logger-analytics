import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';

const emailSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  code: z.string().length(6),
  newPassword: z.string().min(8, 'At least 8 characters'),
});
type EmailData = z.infer<typeof emailSchema>;
type ResetData = z.infer<typeof resetSchema>;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<'request' | 'reset'>('request');
  const navigate = useNavigate();

  const emailForm = useForm<EmailData>({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm<ResetData>({ resolver: zodResolver(resetSchema) });

  async function onRequestSubmit(data: EmailData) {
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email }),
    });
    setEmail(data.email);
    setStage('reset');
    toast.info('If that email exists, a reset code was sent.');
  }

  async function onResetSubmit(data: ResetData) {
    try {
      const res = await fetch('/api/auth/confirm-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: data.code, newPassword: data.newPassword }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? 'Reset failed');
      }
      toast.success('Password reset. You can now sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed');
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            {stage === 'request' ? 'Enter your email to receive a reset code.' : `Enter the code sent to ${email}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stage === 'request' ? (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onRequestSubmit)} className="grid gap-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={emailForm.formState.isSubmitting}>
                  {emailForm.formState.isSubmitting ? 'Sending…' : 'Send reset code'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="underline underline-offset-4">Back to sign in</Link>
                </p>
              </form>
            </Form>
          ) : (
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="grid gap-4">
                <FormField
                  control={resetForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reset code</FormLabel>
                      <FormControl><Input placeholder="123456" maxLength={6} inputMode="numeric" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={resetForm.formState.isSubmitting}>
                  {resetForm.formState.isSubmitting ? 'Resetting…' : 'Reset password'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
