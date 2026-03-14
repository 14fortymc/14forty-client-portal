import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;

const HOSTING_PILL = {
  none:      { label: 'No Hosting', bg: 'var(--cream)',        color: 'var(--slate)',  border: '1px solid var(--border)' },
  essential: { label: 'Essential',  bg: 'var(--blue-light)',   color: 'var(--blue)',   border: 'none' },
  basic:     { label: 'Basic',      bg: '#cde2ec',             color: '#2e6175',       border: 'none' },
  advanced:  { label: 'Advanced',   bg: 'var(--orange-light)', color: 'var(--orange)', border: 'none' },
};

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'Active today';
  if (diff === 1) return 'Last active 1 day ago';
  return `Last active ${diff} days ago`;
}

export default function AdminClients({ onSelectClient, accessToken }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', company_name: '', billing_email: '', billing_address: '', temp_password: '' });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    const { data } = await supabase.rpc('get_clients_list');
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
          portal_url: window.location.origin,
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

  if (loading) return <div style={{ fontSize: 14, color: 'var(--slate)' }}>Loading clients…</div>;

  const q = search.toLowerCase();
  const filtered = clients.filter(c =>
    q === '' ||
    (c.company_name || '').toLowerCase().includes(q) ||
    (c.name || '').toLowerCase().includes(q) ||
    (c.billing_email || '').toLowerCase().includes(q)
  );

  const totalRequests = clients.reduce((s, c) => s + Number(c.open_requests || 0), 0);
  const totalOverdue  = clients.reduce((s, c) => s + Number(c.overdue_invoices || 0), 0);

  return (
    <>
      {/* Top bar: summary + search + new client */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--slate)' }}>
          {clients.length} {clients.length === 1 ? 'client' : 'clients'}
          {totalRequests > 0 && <> · <span style={{ color: 'var(--orange)', fontWeight: 600 }}>{totalRequests} open {totalRequests === 1 ? 'request' : 'requests'}</span></>}
          {totalOverdue > 0  && <> · <span style={{ color: '#dc2626', fontWeight: 600 }}>{totalOverdue} overdue {totalOverdue === 1 ? 'invoice' : 'invoices'}</span></>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients…"
            style={{ ...css.formInput, width: 220, padding: '8px 12px', fontSize: 13 }}
          />
          <button style={css.primaryBtn} onClick={() => setModal(true)}>+ New Client</button>
        </div>
      </div>

      {clients.length === 0 ? (
        <div style={{ ...css.card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 16 }}>No clients yet.</div>
          <button style={css.primaryBtn} onClick={() => setModal(true)}>Add Your First Client</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ fontSize: 14, color: 'var(--slate)', padding: '24px 0' }}>No clients match "{search}".</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(client => {
            const hosting    = HOSTING_PILL[client.hosting_package] || HOSTING_PILL.none;
            const openReqs   = Number(client.open_requests   || 0);
            const awaitingFb = Number(client.awaiting_feedback || 0);
            const overdueInv = Number(client.overdue_invoices  || 0);
            const allClear   = openReqs === 0 && awaitingFb === 0 && overdueInv === 0;
            const lastActive = daysAgo(client.last_sign_in_at);
            const displayName = client.company_name || client.name;
            const contactLine = [client.name, client.billing_email].filter(Boolean).join(' · ');

            return (
              <div key={client.id}
                onClick={() => onSelectClient(client)}
                style={{
                  ...css.card,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.14s',
                  padding: '20px 24px',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(30,41,59,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}>

                {/* Main row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>

                  {/* Left: name, hosting pill, contact */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 22, lineHeight: 1.2, marginBottom: 8 }}>
                      {displayName}
                    </div>
                    <span style={{
                      ...css.pill,
                      background: hosting.bg,
                      color: hosting.color,
                      border: hosting.border,
                      fontSize: 11,
                    }}>
                      {hosting.label}
                    </span>
                    <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contactLine}
                    </div>
                  </div>

                  {/* Right: status pills + last active */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                      {openReqs > 0 && (
                        <span style={{ ...css.pill, ...css.pill_open }}>
                          {openReqs} {openReqs === 1 ? 'request' : 'requests'}
                        </span>
                      )}
                      {awaitingFb > 0 && (
                        <span style={{ ...css.pill, ...css.pill_awaiting }}>
                          {awaitingFb} feedback pending
                        </span>
                      )}
                      {overdueInv > 0 && (
                        <span style={{ ...css.pill, background: '#fef2f2', color: '#dc2626' }}>
                          {overdueInv} overdue
                        </span>
                      )}
                      {allClear && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--slate)' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', flexShrink: 0, display: 'inline-block' }} />
                          All good
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                      {lastActive || 'Never logged in'}
                    </div>
                  </div>
                </div>

                {/* Bottom stats row */}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 12, display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--slate)' }}>
                    {client.projects_count} {Number(client.projects_count) === 1 ? 'project' : 'projects'} · {client.invoices_count} {Number(client.invoices_count) === 1 ? 'invoice' : 'invoices'} · {client.tasks_count} {Number(client.tasks_count) === 1 ? 'task' : 'tasks'}
                  </div>
                  <div style={{ fontSize: 16, color: 'var(--slate)' }}>→</div>
                </div>
              </div>
            );
          })}
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
