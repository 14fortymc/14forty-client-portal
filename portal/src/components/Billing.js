import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';

export default function Billing({ clientId }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ company_name: '', billing_email: '', billing_address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchClient(); }, [clientId]);

  const fetchClient = async () => {
    const { data } = await supabase.from('clients').select('*').eq('id', clientId).single();
    if (data) { setClient(data); setForm({ company_name: data.company_name || '', billing_email: data.billing_email || '', billing_address: data.billing_address || '' }); }
    setLoading(false);
  };

  const saveChanges = async () => {
    setSaving(true);
    await supabase.from('clients').update(form).eq('id', clientId);
    await fetchClient();
    setModal(null);
    setSaving(false);
  };

  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
      <span style={{ fontSize: 13, color: 'var(--slate)' }}>{label}</span>
      <span>{value || <span style={{ color: 'var(--slate)' }}>Not set</span>}</span>
    </div>
  );

  if (loading) return <div style={css.loading}>Loading…</div>;

  return (
    <div style={{ ...css.card, maxWidth: 560 }}>
      <div style={css.cardTitle}>Payment Method</div>
      <div style={{ marginBottom: 24 }}>
        <Row label="Card on file" value="Visa ending in 4242" />
        <Row label="Expiry" value="09/2027" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 0' }}>
          <span style={{ fontSize: 13, color: 'var(--blue)', cursor: 'pointer', fontWeight: 700 }} onClick={() => setModal('card')}>Update card →</span>
        </div>
      </div>

      <div style={css.cardTitle}>Billing Address</div>
      <Row label="Company" value={client?.company_name} />
      <Row label="Address" value={client?.billing_address} />
      <Row label="Email" value={client?.billing_email} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 0' }}>
        <span style={{ fontSize: 13, color: 'var(--blue)', cursor: 'pointer', fontWeight: 700 }} onClick={() => setModal('billing')}>Edit info →</span>
      </div>

      <div style={{ marginTop: 8, padding: '14px', background: 'var(--cream)', borderRadius: 8, fontSize: 13, color: 'var(--slate)' }}>
        Billing is managed through QuickBooks. Payment method changes may take up to one business day to reflect.
      </div>

      {modal === 'billing' && (
        <div style={css.overlay} onClick={() => setModal(null)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>Update Billing Info</div>
            <div style={css.formGroup}><label style={css.formLabel}>Company Name</label><input style={css.formInput} value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Billing Email</label><input style={css.formInput} value={form.billing_email} onChange={e => setForm({ ...form, billing_email: e.target.value })} /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Address</label><input style={css.formInput} value={form.billing_address} onChange={e => setForm({ ...form, billing_address: e.target.value })} /></div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={css.btnSubmit} onClick={saveChanges} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'card' && (
        <div style={css.overlay} onClick={() => setModal(null)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>Update Payment Method</div>
            <div style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 20 }}>To update your card on file, please contact us or log into QuickBooks directly. We'll add self-serve card management soon.</div>
            <div style={css.modalActions}><button style={css.btnSubmit} onClick={() => setModal(null)}>Got it</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
