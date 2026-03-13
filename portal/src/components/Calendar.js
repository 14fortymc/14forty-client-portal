import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';

function getUpcomingSlots() {
  const slots = [];
  const now = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri'];
  const times = ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'];
  let d = new Date(now);
  d.setDate(d.getDate() + 1);
  while (slots.length < 12) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      for (const t of times) {
        slots.push({
          label: `${days[d.getDay()]} ${d.toLocaleDateString('en-US', { month:'short', day:'numeric' })}`,
          time: t,
          iso: `${d.toISOString().split('T')[0]}T${t}`,
        });
      }
    }
    d.setDate(d.getDate() + 1);
  }
  return slots.slice(0, 9);
}

export default function Calendar({ clientId }) {
  const [slots] = useState(getUpcomingSlots);
  const [selected, setSelected] = useState([]);
  const [notes, setNotes] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [past, setPast] = useState([]);

  useEffect(() => { fetchPast(); }, [clientId]);

  const fetchPast = async () => {
    const { data } = await supabase.from('meeting_requests').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(5);
    setPast(data || []);
  };

  const toggle = (i) => setSelected(prev => prev.includes(i) ? prev.filter(s => s !== i) : [...prev, i]);

  const submit = async () => {
    setSaving(true);
    await supabase.from('meeting_requests').insert({
      client_id: clientId,
      proposed_times: selected.map(i => slots[i].iso),
      notes,
      status: 'pending',
    });
    setModal(null);
    setSelected([]);
    setNotes('');
    await fetchPast();
    setSaving(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <>
      <div style={{ ...css.card, marginBottom: 20 }}>
        <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 22, marginBottom: 8 }}>Request a Meeting</div>
        <p style={{ fontSize: 14, color: 'var(--slate)', lineHeight: 1.65, maxWidth: 560, marginBottom: 28 }}>
          Select a handful of times that work best for you — the more options you share, the easier it is for us to nail down a time without the back-and-forth.
        </p>

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--slate)', marginBottom: 14 }}>
          Select all times that work for you
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {slots.map((s, i) => (
            <div key={i}
              onClick={() => toggle(i)}
              style={{
                border: `1px solid ${selected.includes(i) ? 'var(--blue)' : 'var(--border)'}`,
                borderRadius: 8, padding: '10px 16px', cursor: 'pointer',
                background: selected.includes(i) ? 'var(--blue)' : 'var(--cream)',
                color: selected.includes(i) ? '#fff' : 'var(--navy)',
                transition: 'all 0.14s', fontSize: 13, textAlign: 'center',
              }}>
              <div style={{ fontWeight: 700 }}>{s.label}</div>
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 1 }}>{s.time}</div>
            </div>
          ))}
        </div>

        {selected.length > 0 && (
          <>
            <div style={{ background: 'var(--cream)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <strong style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>Your selected times ({selected.length})</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selected.map(i => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 100, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                    {slots[i].label} at {slots[i].time}
                    <span style={{ cursor: 'pointer', color: 'var(--slate)', fontSize: 14 }} onClick={() => toggle(i)}>×</span>
                  </span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={css.formLabel}>Any notes for us? (optional)</label>
              <textarea style={{ ...css.formTextarea, marginTop: 6 }} placeholder="What would you like to discuss?" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <button style={css.primaryBtn} onClick={() => setModal('confirm')}>Submit Request</button>
            </div>
          </>
        )}
      </div>

      {/* Past requests */}
      {past.length > 0 && (
        <div style={css.card}>
          <div style={css.cardTitle}>Past Meeting Requests</div>
          {past.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Requested {fmtDate(r.created_at)}</div>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>{(r.proposed_times || []).length} time{r.proposed_times?.length !== 1 ? 's' : ''} proposed</div>
              </div>
              <span style={{ ...css.pill, ...(r.status === 'confirmed' ? css.pill_paid : r.status === 'cancelled' ? css.pill_pending : css.pill_awaiting) }}>
                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      {modal === 'confirm' && (
        <div style={css.overlay} onClick={() => setModal(null)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>Submit Meeting Request?</div>
            <div style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 20 }}>
              We'll receive your {selected.length} preferred time{selected.length !== 1 ? 's' : ''} and confirm within 24 hours.
            </div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={css.btnSubmit} onClick={submit} disabled={saving}>{saving ? 'Sending…' : 'Send Request'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
