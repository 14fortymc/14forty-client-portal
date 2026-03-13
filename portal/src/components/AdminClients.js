import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;

export default function AdminClients({ onSelectClient, accessToken }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', company_name: '', billing_email: '', billing_address: '', temp_password: '' });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*, projects(count), invoices(count), feedback_tasks(count)')
      .order('created_at', { ascending: false });
    setClients(data || []);
    setLoading(false);
  };

  const createNewClient = async () => {
    if (!form.name || !form.billing_email || !form.temp_password) return;
    if (!accessToken) {
      setResult({ success: false, message: 'Session expired — please refresh and try again.' });
      return;
    }
    setSaving(true);
    setResult(null);

    try {
      // Call Edge Function — runs server-side with service role, never touches your session
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-client-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: form.name,
          company_name: form.company_name,
          billing_email: form.billing_email,
          billing_address: form.billing_address,
          temp_password: form.temp_password,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create client');

      setResult({ success: true, email: form.billing_email });
      setForm({ name: '', company_name: '', billing_email: '', billing_address: '', temp_password: '' });
      await fetchClients();

    } catch (err) {
      setResult({ success: false, message: err.message });
    }

    setSaving(false);
  };

  const closeModal = () => {
    setModal(false);
    setResult(null);
    setForm({ name: '', company_name: '', billing_email: '', billing_address: '', temp_password: '' });
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  if (loading) return <div style={{ fontSize: 14, color: 'var(--slate)' }}>Loading clients…</div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button style={css.primaryBtn} onClick={() => setModal(true)}>+ New Client</button>
      </div>

      {clients.length === 0 ? (
        <div style={{ ...css.card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 16 }}>No clients yet.</div>
          <button style={css.primaryBtn} onClick={() => setModal(true)}>Add Your First Client</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {clients.map(client => (
            <div key={client.id}
              onClick={() => onSelectClient(client)}
              style={{ ...css.card, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'box-shadow 0.14s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(30,41,59,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}>
              <div>
                <div style={{ fontSize: 18, fontFamily: "'GaramondPro',Georgia,serif", marginBottom: 4 }}>{client.company_name || client.name}</div>
                <div style={{ fontSize: 13, color: 'var(--slate)' }}>{client.billing_email} · Added {fmtDate(client.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontFamily: "'GaramondPro',Georgia,serif" }}>{client.projects?.[0]?.count || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Projects</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontFamily: "'GaramondPro',Georgia,serif" }}>{client.invoices?.[0]?.count || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Invoices</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontFamily: "'GaramondPro',Georgia,serif" }}>{client.feedback_tasks?.[0]?.count || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Tasks</div>
                </div>
                <div style={{ fontSize: 20, color: 'var(--slate)' }}>→</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div style={css.overlay} onClick={closeModal}>
          <div style={{ ...css.modal, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>New Client</div>

            {result ? (
              <div>
                <div style={{
                  padding: 16, borderRadius: 8, marginBottom: 20,
                  background: result.success ? 'var(--blue-light)' : '#fef2f2',
                  color: result.success ? 'var(--blue)' : '#dc2626',
                  fontSize: 14, lineHeight: 1.5,
                }}>
                  {result.success
                    ? `✓ Account created for ${result.email}. Share the portal URL and their temporary password with them directly.`
                    : result.message}
                </div>
                {result.success && (
                  <div style={{ background: 'var(--cream)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--slate)', marginBottom: 8 }}>Share with client</div>
                    <div style={{ fontSize: 13, color: 'var(--navy)', lineHeight: 1.8 }}>
                      <strong>Portal URL:</strong> {window.location.origin}<br />
                      <strong>Email:</strong> {result.email}<br />
                      <strong>Temp Password:</strong> (the one you just set)
                    </div>
                  </div>
                )}
                <div style={css.modalActions}>
                  <button style={css.btnSubmit} onClick={closeModal}>Done</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 20, padding: '10px 14px', background: 'var(--cream)', borderRadius: 8 }}>
                  This will create a login account for the client using their billing email. Share the portal URL and temporary password with them directly.
                </div>

                <div style={css.formGroup}>
                  <label style={css.formLabel}>Contact Name</label>
                  <input style={css.formInput} placeholder="e.g. John Smith" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div style={css.formGroup}>
                  <label style={css.formLabel}>Company Name</label>
                  <input style={css.formInput} placeholder="e.g. Acme Co." value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div style={css.formGroup}>
                  <label style={css.formLabel}>Billing Email <span style={{ color: 'var(--orange)' }}>— used as login</span></label>
                  <input style={css.formInput} placeholder="billing@acmeco.com" value={form.billing_email} onChange={e => setForm({ ...form, billing_email: e.target.value })} />
                </div>
                <div style={css.formGroup}>
                  <label style={css.formLabel}>Billing Address</label>
                  <input style={css.formInput} placeholder="123 Main St, Tyler TX 75701" value={form.billing_address} onChange={e => setForm({ ...form, billing_address: e.target.value })} />
                </div>

                <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0' }} />

                <div style={css.formGroup}>
                  <label style={css.formLabel}>Temporary Password</label>
                  <input
                    style={css.formInput}
                    type="text"
                    placeholder="e.g. Welcome2025!"
                    value={form.temp_password}
                    onChange={e => setForm({ ...form, temp_password: e.target.value })}
                  />
                  <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 6 }}>Client will use this to log in. Ask them to change it after first login.</div>
                </div>

                <div style={css.modalActions}>
                  <button style={css.btnCancel} onClick={closeModal}>Cancel</button>
                  <button
                    style={{ ...css.btnSubmit, opacity: (!form.name || !form.billing_email || !form.temp_password) ? 0.5 : 1 }}
                    onClick={createNewClient}
                    disabled={saving || !form.name || !form.billing_email || !form.temp_password}>
                    {saving ? 'Creating Account…' : 'Create Client & Account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
