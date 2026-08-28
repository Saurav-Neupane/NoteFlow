import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Mail, Lock, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import * as authService from '@/services/auth.service';
import { isValidEmail } from '@/utils/text';
import { APP_NAME, APP_TAGLINE } from '@/constants';

/** Auth screen: login, signup, magic link, Google OAuth. */
export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'email' | 'google' | 'magic' | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) return toast.error('Enter a valid email');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');

    setBusy('email');
    const res =
      mode === 'login'
        ? await authService.signInWithEmail(email, password)
        : await authService.signUpWithEmail(email, password, name);
    setBusy(null);

    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(mode === 'login' ? 'Welcome back!' : 'Account created — welcome to NoteFlow!');
    navigate('/dashboard');
  }

  async function google() {
    setBusy('google');
    const res = await authService.signInWithGoogle();
    setBusy(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    // Firebase popup sign-in resolves synchronously, so redirect immediately.
    toast.success('Welcome!');
    navigate('/dashboard');
  }

  async function magicLink() {
    if (!isValidEmail(email)) return toast.error('Enter your email first');
    setBusy('magic');
    const res = await authService.sendMagicLink(email);
    setBusy(null);
    toast[res.error ? 'error' : 'success'](res.error ?? 'Magic link sent — check your inbox');
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      {/* Ambient blobs */}
      <div className="blob left-[-10%] top-[-10%] h-96 w-96 bg-indigo-500/20" />
      <div className="blob bottom-[-15%] right-[-10%] h-[28rem] w-[28rem] bg-fuchsia-500/20" />
      <div className="blob left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 bg-violet-500/10" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass relative z-10 w-full max-w-md rounded-3xl border p-6 sm:p-8"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="fab-gradient mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-soft">
            <FileText className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{APP_TAGLINE}</p>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'login' | 'signup')}>
          <TabsList className="mb-5 w-full">
            <TabsTrigger value="login" className="flex-1">Sign in</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">Create account</TabsTrigger>
          </TabsList>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" className="pl-9" />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={busy !== null}>
              {busy === 'email' ? <Loader2 className="animate-spin" /> : null}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={google} disabled={busy !== null}>
              {busy === 'google' ? <Loader2 className="animate-spin" /> : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.6 1.7 15 0.6 12 0.6 7.3 0.6 3.2 3.3 1.4 7.3l3.9 3C6.4 7.5 8.9 5.4 12 5.4z" />
                  <path fill="#4285F4" d="M23.4 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.4c-.3 1.5-1.1 2.8-2.4 3.6l3.8 2.9c2.2-2 3.6-5 3.6-8.8z" />
                  <path fill="#FBBC05" d="M5.3 14.4c-.3-.9-.4-1.9-.4-2.9s.1-2 .4-2.9l-3.9-3C.4 8.4 0 10.1 0 12s.4 3.6 1.1 5.3l3.9-3.1c.1-.1.2-.1.3 0z" />
                  <path fill="#34A853" d="M12 23.4c3.1 0 5.7-1 7.6-2.7l-3.8-2.9c-1 .7-2.4 1.2-3.8 1.2-3.1 0-5.6-2.1-6.5-5.1l-3.9 3.1c1.8 4 5.9 6.4 10.4 6.4z" />
                </svg>
              )}
              Continue with Google
            </Button>

            <Button variant="ghost" className="w-full" onClick={magicLink} disabled={busy !== null}>
              {busy === 'magic' ? <Loader2 className="animate-spin" /> : <Mail className="h-4 w-4" />}
              Email me a magic link
            </Button>
          </div>
        </Tabs>
      </motion.div>
    </div>
  );
}