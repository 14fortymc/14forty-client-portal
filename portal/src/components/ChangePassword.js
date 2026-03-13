import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';

export default function ChangePassword({ userId }) {
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: form.password });
      if (updateError) throw updateError;

      const { error: flagError } = await supabase
        .from('client_users')
        .update({ password_changed: true })
        .eq('user_id', userId);
      if (flagError) console.error('Could not set password_changed flag:', flagError);

      // Reload so App.js re-runs loadClient and sees password_changed = true
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      {/* Wordmark */}
      <div style={{
        fontFamily: "'GaramondPro', Georgia, serif",
        fontSize: 28,
        color: 'var(--navy)',
        marginBottom: 36,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        14Forty
        <span style={{ width: 7, height: 7, background: 'var(--orange)', borderRadius: '50%', display: 'inline-block' }} />
      </div>

      {/* Card */}
      <div style={{
        ...css.card,
        width: '100%',
        maxWidth: 440,
        padding: '40px 40px 36px',
      }}>
        <h1 style={{
          fontFamily: "'GaramondPro', Georgia, serif",
          fontSize: 24,
          color: 'var(--navy)',
          fontWeight: 400,
          margin: '0 0 8px',
        }}>
          Welcome — let's secure your account
        </h1>
        <p style={{ fontSize: 14, color: 'var(--slate)', margin: '0 0 28px', lineHeight: 1.6 }}>
          Please set a new password to continue. It must be at least 8 characters.
        </p>

        <div style={css.formGroup}>
          <label style={css.formLabel}>New Password</label>
          <input
            style={css.formInput}
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>

        <div style={css.formGroup}>
          <label style={css.formLabel}>Confirm Password</label>
          <input
            style={css.formInput}
            type="password"
            placeholder="Re-enter your password"
            value={form.confirm}
            onChange={e => setForm({ ...form, confirm: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            fontSize: 13,
            borderRadius: 7,
            padding: '10px 14px',
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <button
          style={{
            ...css.btnSubmit,
            width: '100%',
            padding: '13px 0',
            fontSize: 15,
            opacity: saving ? 0.6 : 1,
            marginTop: 8,
          }}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Set Password & Continue →'}
        </button>
      </div>
    </div>
  );
}
