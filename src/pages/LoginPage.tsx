import React, { useState } from 'react';
import { Loader2, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';
import { appSwal } from '../lib/appSwal';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../lib/apiResponse';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      const message = t('swal.validation.loginRequired');
      setError(message);
      await appSwal.errorLoginIncomplete();
      return;
    }

    try {
      await login(email, password);
      await appSwal.successLogin();
    } catch (err) {
      const message = getApiErrorMessage(err, t('swal.error.loginFailed.text'));
      setError(message);
      await appSwal.errorLoginFailed(message);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary-blue text-[#181a20] shadow-sm">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">G-Tech Auditor</h1>
          <p className="mt-1 text-sm text-muted-foreground">Admin Dashboard</p>
        </div>

        <div className="panel p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Sign In</h2>
            <p className="text-sm text-muted-foreground">Welcome back. Please enter your details.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-danger-red/20 bg-danger-red/10 p-3 text-sm text-danger-red">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="ml-1 text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  className="form-input pl-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="ml-1 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Password</label>
                <a href="#" className="text-xs font-semibold text-primary-blue hover:text-primary-blue-dark">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Password"
                  className="form-input pl-11"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn('btn-primary w-full py-3', isLoading && 'opacity-70')}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-divider pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              New to G-Tech Auditor?{' '}
              <a href="#" className="font-semibold text-primary-blue hover:underline">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
