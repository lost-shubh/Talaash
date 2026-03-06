'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

export default function LoginPage() {
  const { login, register } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [fm, setFm] = useState({ name: '', email: '', password: '', phone: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => { setFm(x => ({ ...x, [k]: v })); setErrs(e => ({ ...e, [k]: '' })); };

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (mode === 'register' && !fm.name.trim()) e.name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fm.email)) e.email = 'Valid email required';
    if (!fm.password || fm.password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  async function go() {
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(fm.email, fm.password);
        toast('Welcome back!', 'success');
      } else {
        await register({ name: fm.name, email: fm.email, password: fm.password, phone: fm.phone });
        toast('Account created!', 'success');
      }
      const redirect = params.get('from') || '/';
      router.push(redirect);
    } catch (err: any) {
      toast(err.message || 'Authentication failed', 'error');
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-title">{mode === 'login' ? 'SIGN IN' : 'REGISTER'}</div>
        <p className="login-sub">
          {mode === 'login'
            ? 'Login to view contact details and file reports.'
            : 'Create a free account to file reports and view contact details.'
          }
        </p>

        <div className="demo-creds">
          <strong>Demo accounts:</strong><br />
          Admin: admin@talaash.in / admin123<br />
          User: rahul@example.com / user123
        </div>

        <div className="tabs" style={{ marginBottom: 24 }}>
          <div className={`tab${mode === 'login' ? ' active' : ''}`} onClick={() => { setMode('login'); setErrs({}); }}>Login</div>
          <div className={`tab${mode === 'register' ? ' active' : ''}`} onClick={() => { setMode('register'); setErrs({}); }}>Register</div>
        </div>

        {mode === 'register' && (
          <>
            <div className="fg">
              <label className="flabel">Full Name *</label>
              <input className="finput" value={fm.name} onChange={e => set('name', e.target.value)} placeholder="Rahul Gupta" />
              {errs.name && <p className="ferr">{errs.name}</p>}
            </div>
            <div className="fg">
              <label className="flabel">Phone</label>
              <input className="finput" value={fm.phone} onChange={e => set('phone', e.target.value)} placeholder="+91-9876543210" />
            </div>
          </>
        )}

        <div className="fg">
          <label className="flabel">Email *</label>
          <input className="finput" type="email" value={fm.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
          {errs.email && <p className="ferr">{errs.email}</p>}
        </div>

        <div className="fg">
          <label className="flabel">Password *</label>
          <input className="finput" type="password" value={fm.password} onChange={e => set('password', e.target.value)} placeholder={mode === 'register' ? 'Min 6 characters' : ''} />
          {errs.password && <p className="ferr">{errs.password}</p>}
        </div>

        <button className="btn btn-solid btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={go} disabled={loading}>
          {loading ? <><span className="sp sp-w" /> Please wait…</> : mode === 'login' ? 'Sign In →' : 'Create Account →'}
        </button>
      </div>
    </div>
  );
}
