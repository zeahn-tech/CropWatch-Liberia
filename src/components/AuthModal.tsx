import React, { useState, useEffect } from 'react';
import {
  LogIn,
  UserPlus,
  Lock,
  Mail,
  User,
  Shield,
  AlertCircle,
  X,
  CheckCircle,
  Sprout,
  ExternalLink,
  CloudCheck,
} from 'lucide-react';
import { UserRole } from '../types.js';
import {
  supabase,
  supabaseSignIn,
  supabaseSignUp,
  SUPABASE_URL,
  isSupabaseConfigured,
} from '../lib/supabase.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (token: string, user: any, expertProfile?: any) => void;
  isDemoMode?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isDemoMode,
}) => {
  const [tab, setTab] = useState<'supabase_login' | 'supabase_register' | 'local_login'>('supabase_login');

  // Supabase & Local form states
  const [email, setEmail] = useState('emmanuelzeahn45@gmail.com');
  const [password, setPassword] = useState('Password123!');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('farmer');
  const [regCounty, setRegCounty] = useState('Bong');
  const [regOrg, setRegOrg] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [emailNotConfirmedNotice, setEmailNotConfirmedNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supabaseLive, setSupabaseLive] = useState<boolean | null>(null);

  // Check Supabase connection health
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/supabase/status')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.status?.authHealthy) {
          setSupabaseLive(true);
        } else {
          setSupabaseLive(false);
        }
      })
      .catch(() => setSupabaseLive(false));
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Supabase Cloud Sign In
  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setEmailNotConfirmedNotice(false);
    setLoading(true);

    try {
      const result = await supabaseSignIn(email, password);

      if (!result.success) {
        if (result.emailConfirmationRequired) {
          setEmailNotConfirmedNotice(true);
          setError(
            'The authorization settings require email confirmation for this account. Please check your inbox, or disable email confirmation in the auth settings.'
          );
        } else {
          setError(result.error || 'Failed to sign in.');
        }
        return;
      }

      if (result.session?.access_token) {
        // Sync the Supabase session to backend
        const syncRes = await fetch('/api/auth/supabase-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            accessToken: result.session.access_token,
            user: result.user,
          }),
        });

        const syncData = await syncRes.json();
        if (!syncRes.ok || !syncData.success) {
          throw new Error(syncData.error || 'Could not synchronize cloud profile with backend.');
        }

        onLoginSuccess(syncData.token, syncData.user, syncData.expertProfile);
        if (onClose) onClose();
      } else {
        setError('No active session returned. Please check email confirmation.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Supabase Cloud Sign Up
  const handleSupabaseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setEmailNotConfirmedNotice(false);
    setLoading(true);

    try {
      const result = await supabaseSignUp(regEmail, regPassword, {
        fullName: regFullName,
        role: regRole,
        county: regCounty,
        organization: regOrg,
      });

      if (!result.success) {
        setError(result.error || 'Failed to register account.');
        return;
      }

      if (result.session?.access_token) {
        // Direct session without email confirmation
        const syncRes = await fetch('/api/auth/supabase-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            accessToken: result.session.access_token,
            user: result.user,
          }),
        });

        const syncData = await syncRes.json();
        onLoginSuccess(syncData.token, syncData.user, syncData.expertProfile);
        if (onClose) onClose();
      } else {
        // User created, confirmation email sent
        setSuccessNotice(
          `User created successfully! A confirmation email has been dispatched to ${regEmail}. Please confirm before logging in, or disable "Confirm email" in your auth settings.`
        );
        setEmail(regEmail);
        setPassword(regPassword);
        setTab('supabase_login');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Local/Seed Login
  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        if (text.trim().startsWith('<')) {
           throw new Error('Backend is not running. GitHub Pages only supports static files, not Node.js servers. Please deploy to Render, Vercel, or Cloud Run.');
        }
        throw new Error('Invalid JSON response from server.');
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed. Please check credentials.');
      }

      onLoginSuccess(data.token, data.user, data.expertProfile);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const prefillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setEmailNotConfirmedNotice(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative my-8">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Supabase Status Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 mb-2.5 border border-emerald-500/30">
            <Sprout className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">CropWatch Liberia Authentication</h2>
          
          {/* Supabase Connection Indicator */}
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-950 border border-stone-800 text-xs text-stone-300">
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseLive === true ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-mono text-[11px] text-stone-300">
              Cloud Server: {SUPABASE_URL.replace('https://', '')}
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-800 mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('supabase_login');
              setError(null);
              setEmailNotConfirmedNotice(false);
            }}
            className={`flex-1 py-2.5 border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'supabase_login'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('supabase_register');
              setError(null);
              setEmailNotConfirmedNotice(false);
            }}
            className={`flex-1 py-2.5 border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'supabase_register'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Register
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('local_login');
              setError(null);
              setEmailNotConfirmedNotice(false);
            }}
            className={`py-2.5 px-3 border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'local_login'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Shield className="w-4 h-4" /> Seed Accounts
          </button>
        </div>

        {/* Notice Banners */}
        {successNotice && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {emailNotConfirmedNotice && (
          <div className="mb-4 p-3 rounded-lg bg-amber-950/70 border border-amber-800 text-amber-300 text-xs space-y-1">
            <p className="font-semibold text-amber-200">Email Confirmation Required:</p>
            <p className="text-[11px] text-amber-300/90">
              The authentication system has email verification turned on by default. You can confirm via the verification email sent to you, or switch to the <strong>Seed Accounts</strong> tab to log in immediately with pre-verified credentials.
            </p>
            <div className="pt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setTab('local_login');
                  setError(null);
                }}
                className="px-2 py-1 rounded bg-amber-800 hover:bg-amber-700 text-white font-medium text-[11px] transition-colors"
              >
                Use Pre-Verified Seed Account
              </button>
            </div>
          </div>
        )}

        {/* 1. Supabase Sign In Form */}
        {tab === 'supabase_login' && (
          <form onSubmit={handleSupabaseLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">User Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. emmanuelzeahn45@gmail.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password123!"
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sprout className="w-4 h-4" />
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            <div className="pt-2 text-center text-xs text-stone-400">
              New user?{' '}
              <button
                type="button"
                onClick={() => setTab('supabase_register')}
                className="text-emerald-400 hover:underline font-semibold"
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* 2. Supabase Register Form */}
        {tab === 'supabase_register' && (
          <form onSubmit={handleSupabaseRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Emmanuel Zeahn"
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="user@gmail.com"
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 6 chars"
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Role</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="farmer">Smallholder Farmer</option>
                  <option value="expert">Agronomy Specialist (Expert)</option>
                  <option value="senior_expert">Senior Research Specialist (CARI/MOA)</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">County (Liberia)</label>
                <select
                  value={regCounty}
                  onChange={(e) => setRegCounty(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-emerald-500"
                >
                  {[
                    'Bong',
                    'Nimba',
                    'Lofa',
                    'Montserrado',
                    'Margibi',
                    'Grand Bassa',
                    'Bomi',
                    'Grand Cape Mount',
                    'Gbarpolu',
                    'Sinoe',
                    'River Cess',
                    'Grand Gedeh',
                    'River Gee',
                    'Maryland',
                    'Grand Kru',
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c} County
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Organization / Farm Name (Optional)</label>
              <input
                type="text"
                value={regOrg}
                onChange={(e) => setRegOrg(e.target.value)}
                placeholder="e.g. Suakoko Cooperative, CARI, MoA"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>
        )}

        {/* 3. Local/Seed Accounts Login */}
        {tab === 'local_login' && (
          <form onSubmit={handleLocalLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm rounded-lg shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Authenticating...' : 'Sign In (Seed Account)'}
            </button>

            {/* Quick Prefill Buttons */}
            <div className="mt-4 pt-3 border-t border-stone-800">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                One-Click Quick Fill (Password: Password123!):
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => prefillDemo('emmanuelzeahn45@gmail.com', 'Password123!')}
                  className="text-left p-2 rounded bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 transition-colors"
                >
                  <span className="font-semibold text-emerald-400 block">Farmer (Emmanuel)</span>
                  <span className="text-[10px] text-stone-500 block truncate">emmanuelzeahn45@gmail.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => prefillDemo('moses.kollie@nimba.farmers.lr', 'Password123!')}
                  className="text-left p-2 rounded bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 transition-colors"
                >
                  <span className="font-semibold text-emerald-400 block">Farmer 2 (Moses)</span>
                  <span className="text-[10px] text-stone-500 block truncate">Nimba County</span>
                </button>

                <button
                  type="button"
                  onClick={() => prefillDemo('expert.marie@cari.gov.lr', 'Password123!')}
                  className="text-left p-2 rounded bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 transition-colors"
                >
                  <span className="font-semibold text-blue-400 block">Verified Expert</span>
                  <span className="text-[10px] text-stone-500 block truncate">Dr. Marie Kromah (CARI)</span>
                </button>

                <button
                  type="button"
                  onClick={() => prefillDemo('admin.barclay@cropwatch.gov.lr', 'Password123!')}
                  className="text-left p-2 rounded bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 transition-colors"
                >
                  <span className="font-semibold text-purple-400 block">Admin</span>
                  <span className="text-[10px] text-stone-500 block truncate">admin.barclay@cropwatch.gov.lr</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
