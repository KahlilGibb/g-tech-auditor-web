import React, { useState } from 'react';
import { Lock, LogIn, User, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { appSwal } from '../lib/appSwal';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../lib/apiResponse';
import { Button, Eyebrow, Field, Input, Alert } from '../components/ui';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!identifier || !password) {
      const message = t('swal.validation.loginRequired');
      setError(message);
      await appSwal.errorLoginIncomplete();
      return;
    }

    try {
      await login({ identifier, password });
      await appSwal.successLogin();
    } catch (err) {
      const message = getApiErrorMessage(err, t('swal.error.loginFailed.text'));
      setError(message);
      await appSwal.errorLoginFailed(message);
    }
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand / atmosphere panel ─────────────────────────────────────── */}
      <aside className="relative hidden overflow-hidden bg-ink-deep p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(700px 380px at 12% 0%, color-mix(in oklch, var(--color-primary-blue) 55%, transparent), transparent 60%), radial-gradient(560px 320px at 90% 100%, color-mix(in oklch, var(--color-companion) 22%, transparent), transparent 55%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 40% 40%, black 20%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 40% 40%, black 20%, transparent 72%)',
          }}
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight">G-Tech</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/55">Auditor System</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Eyebrow className="text-white/55">Field audit, done right</Eyebrow>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight">
            Every inspection,{' '}
            <span className="font-serif italic text-primary-blue-light">accounted for.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            Plan audits, capture findings on site, and track corrective actions to close-out — all from one
            workspace your team actually trusts.
          </p>
        </div>

        <div className="relative flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white/45">
          <span className="inline-flex items-center gap-2">
            <span className="tally-dot h-1.5 w-1.5" /> live sync
          </span>
          <span>role-based access</span>
          <span>audit trail</span>
        </div>
      </aside>

      {/* ── Form panel ───────────────────────────────────────────────────── */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-deep text-white">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight text-ink-deep">G-Tech Auditor</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone">Auditor System</p>
            </div>
          </div>

          <Eyebrow>Sign in</Eyebrow>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-deep">Welcome back</h1>
          <p className="mt-1.5 text-[15px] text-slate">Enter your details to reach your workspace.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && <Alert tone="danger">{error}</Alert>}

            <Field label="Username / Email" htmlFor="identifier">
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                icon={<User className="h-[18px] w-[18px]" />}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Username or email"
              />
            </Field>

            <Field
              htmlFor="password"
              label={
                <span className="flex w-full items-center justify-between">
                  <span>Password</span>
                  <a href="#" className="text-xs font-semibold text-primary-blue hover:text-primary-blue-dark">
                    Forgot password?
                  </a>
                </span>
              }
            >
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                icon={<Lock className="h-[18px] w-[18px]" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Button type="submit" size="lg" block loading={isLoading} icon={<LogIn className="h-[18px] w-[18px]" />}>
              Sign in
            </Button>
          </form>

          <p className="mt-8 border-t border-hairline-soft pt-6 text-center text-sm text-slate">
            New to G-Tech Auditor?{' '}
            <a
              href="#"
              className="inline-flex items-center gap-1 font-semibold text-primary-blue hover:text-primary-blue-dark"
            >
              Contact support <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
