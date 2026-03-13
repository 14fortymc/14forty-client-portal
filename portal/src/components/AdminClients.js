import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';

export default function AdminClients({ onSelectClient }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', company_name: '', billing_email: '', billing_address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*, projects(count), invoices(count), feedback_tasks(count)')
      .order('created_at', { ascending: false });
    setClients(data || []);
    setLoading(false);
  };

  const createClient = async () => {
    if (!form.name) return;
    setSaving(true);
    await supabase.from('clients').insert(form);
    setModal(false);
    setForm({ name: '', company_name: '', billing_email: '', billing_address: '' });
    await fetchClients();
    setSaving(false);
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
        <div style={css.overlay} onClick={() => setModal(false)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>New Client</div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Contact Name</label>
              <input style={css.formInput} placeholder="e.g. John Smith" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Company Name</label>
              <input style={css.formInput} placeholder="e.g. Acme Co." value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Billing Email</label>
              <input style={css.formInput} placeholder="billing@acmeco.com" value={form.billing_email} onChange={e => setForm({ ...form, billing_email: e.target.value })} />
            </div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Billing Address</label>
              <input style={css.formInput} placeholder="123 Main St, Tyler TX 75701" value={form.billing_address} onChange={e => setForm({ ...form, billing_address: e.target.value })} />
            </div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(false)}>Cancel</button>
              <button style={css.btnSubmit} onClick={createClient} disabled={saving}>{saving ? 'Creating…' : 'Create Client'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
