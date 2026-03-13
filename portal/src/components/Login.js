import { useState } from 'react';
import { supabase } from '../lib/supabase';

const s = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' },
  box: { background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, padding: '48px 40px', width: 400, boxShadow: 'var(--shadow)' },
  logo: { fontFamily: "'GaramondPro', Georgia, serif", fontSize: 28, color: 'var(--navy)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, background: 'var(--orange)', borderRadius: '50%' },
  sub: { fontSize: 14, color: 'var(--slate)', marginBottom: 36 },
  label: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--slate)', marginBottom: 6, display: 'block' },
  input: { width: '100%', border: '1px solid var(--border)', borderRadius: 7, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: 'var(--navy)', background: 'var(--cream)', outline: 'none', marginBottom: 16 },
  btn: { width: '100%', background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 7, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 },
  err: { fontSize: 13, color: 'var(--orange)', marginTop: 12, textAlign: 'center' },
  reset: { fontSize: 13, color: 'var(--blue)', cursor: 'pointer', textAlign: 'center', marginTop: 16, display: 'block' },
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'reset'

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setResetSent(true);
    setLoading(false);
  };

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={s.logo}>14Forty <div style={s.dot}></div></div>
        <div style={s.sub}>Client Portal — {mode === 'login' ? 'Sign in to your account' : 'Reset your password'}</div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
            {error && <div style={s.err}>{error}</div>}
            <span style={s.reset} onClick={() => { setMode('reset'); setError(''); }}>Forgot your password?</span>
          </form>
        ) : resetSent ? (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:14, color:'var(--slate)', marginBottom:16}}>Check your email — we sent a reset link to <strong>{email}</strong>.</div>
            <span style={s.reset} onClick={() => { setMode('login'); setResetSent(false); }}>Back to sign in</span>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
            <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send Reset Link'}</button>
            {error && <div style={s.err}>{error}</div>}
            <span style={s.reset} onClick={() => { setMode('login'); setError(''); }}>Back to sign in</span>
          </form>
        )}
      </div>
    </div>
  );
}
