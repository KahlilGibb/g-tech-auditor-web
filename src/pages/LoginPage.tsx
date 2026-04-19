import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogIn, Mail, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-blue rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary-blue/20">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">G-Tech Auditor</h1>
          <p className="text-muted-foreground mt-1">Admin Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-divider">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Sign In</h2>
            <p className="text-muted-foreground text-sm">Welcome back! Please enter your details.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-danger-red/10 border border-danger-red/20 text-danger-red text-sm rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gtech.com"
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-divider rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-foreground">Password</label>
                <a href="#" className="text-xs font-semibold text-primary-blue hover:text-primary-blue-dark">Forgot Password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-divider rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full py-3 bg-primary-blue text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-primary-blue-dark active:scale-[0.98]",
                isLoading && "opacity-70 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-divider text-center">
            <p className="text-sm text-muted-foreground">
              New to G-Tech Auditor? <a href="#" className="font-semibold text-primary-blue hover:underline">Contact Support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
