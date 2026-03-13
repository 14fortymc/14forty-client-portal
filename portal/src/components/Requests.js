import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';

export default function Requests({ clientId }) {
  const [tasks, setTasks] = useState([]);
  const [workRequests, setWorkRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [form, setForm] = useState({ type: '', subject: '', detail: '' });
  const [respond, setRespond] = useState({ response: '', decision: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, [clientId]);

  const fetchAll = async () => {
    const [{ data: t }, { data: w }] = await Promise.all([
      supabase.from('feedback_tasks').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('work_requests').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    ]);
    setTasks(t || []);
    setWorkRequests(w || []);
    setLoading(false);
  };

  const submitWorkRequest = async () => {
    if (!form.subject) return;
    setSaving(true);
    await supabase.from('work_requests').insert({ client_id: clientId, ...form });
    setModal(null);
    setForm({ type: '', subject: '', detail: '' });
    await fetchAll();
    setSaving(false);
  };

  const submitResponse = async () => {
    if (!activeTask) return;
    setSaving(true);
    await supabase.from('feedback_tasks').update({
      response: respond.response,
      decision: respond.decision,
      status: 'completed',
      responded_at: new Date().toISOString(),
    }).eq('id', activeTask.id);
    setModal(null);
    setRespond({ response: '', decision: '' });
    await fetchAll();
    setSaving(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const ReviewLinks = ({ task }) => {
    const links = [
      task.markup_url && { url: task.markup_url, label: 'View on Markup.io', color: '#6c42e8', bg: '#f0ebff' },
      task.drive_url && { url: task.drive_url, label: 'Open in Drive', color: '#1a73e8', bg: '#e8f0fe' },
      task.loom_url && { url: task.loom_url, label: 'Watch Loom', color: '#625df5', bg: '#eeeeff' },
    ].filter(Boolean);

    if (links.length === 0) return null;

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--slate)', width: '100%', marginBottom: 2 }}>Review Materials</div>
        {links.map(({ url, label, color, bg }) => (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 700, color, background: bg,
            borderRadius: 6, padding: '5px 12px', textDecoration: 'none',
            border: `1px solid ${color}22`,
          }}>
            {label} ↗
          </a>
        ))}
      </div>
    );
  };

  if (loading) return <div style={css.loading}>Loading…</div>;

  return (
    <>
      {/* MY TASKS */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 22 }}>My Tasks</div>
          <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 2 }}>Items from 14Forty that need your attention</div>
        </div>
        {tasks.length === 0 ? (
          <div style={css.card}><div style={css.empty}>No pending tasks.</div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.map(task => (
              <div key={task.id} style={{
                ...css.card, padding: '16px 18px',
                borderLeft: task.status === 'awaiting' ? '3px solid var(--orange)' : '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{task.title}</div>
                  <span style={{
                    ...css.pill,
                    ...(task.status === 'awaiting' ? css.pill_awaiting : css.pill_paid),
                    whiteSpace: 'nowrap',
                  }}>{task.status === 'awaiting' ? 'Awaiting Response' : 'Completed'}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.5 }}>{task.description}</div>

                <ReviewLinks task={task} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: task.status === 'awaiting' ? 'var(--orange)' : 'var(--slate)', fontWeight: task.status === 'awaiting' ? 700 : 400 }}>
                    {task.due_date ? `Due ${fmtDate(task.due_date)}` : task.status === 'completed' ? `Completed ${fmtDate(task.responded_at)}` : ''}
                  </div>
                  {task.status === 'awaiting' && (
                    <button style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                      onClick={() => { setActiveTask(task); setModal('respond'); }}>
                      Respond
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: 'var(--border)', marginBottom: 32 }}></div>

      {/* WORK REQUESTS */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 22 }}>Work Requests</div>
            <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 2 }}>Ad hoc requests you've submitted to us</div>
          </div>
          <button style={css.primaryBtn} onClick={() => setModal('request')}>+ New Request</button>
        </div>
        {workRequests.length === 0 ? (
          <div style={css.card}><div style={css.empty}>No requests submitted yet.</div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {workRequests.map(r => (
              <div key={r.id} style={{ ...css.card, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{r.subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{r.type} · Submitted {fmtDate(r.created_at)}</div>
                </div>
                <span style={{ ...css.pill, ...(r.status === 'completed' ? css.pill_paid : r.status === 'in_progress' ? css.pill_awaiting : css.pill_due) }}>
                  {r.status === 'in_progress' ? 'In Progress' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Work Request Modal */}
      {modal === 'request' && (
        <div style={css.overlay} onClick={() => setModal(null)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>New Work Request</div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Type</label>
              <select style={css.formSelect} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="">Select type…</option>
                <option>Website Update</option>
                <option>Design</option>
                <option>Copy Edit</option>
                <option>Ad Hoc Work</option>
                <option>Other</option>
              </select>
            </div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Subject</label>
              <input style={css.formInput} placeholder="Brief description…" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Details</label>
              <textarea style={css.formTextarea} placeholder="Add any context, links, or reference materials…" value={form.detail} onChange={e => setForm({ ...form, detail: e.target.value })} />
            </div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={css.btnSubmit} onClick={submitWorkRequest} disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Respond Modal */}
      {modal === 'respond' && activeTask && (
        <div style={css.overlay} onClick={() => setModal(null)}>
          <div style={{ ...css.modal, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>Respond to Feedback Request</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{activeTask.title}</div>
            {activeTask.description && <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 16, lineHeight: 1.5 }}>{activeTask.description}</div>}

            <ReviewLinks task={activeTask} />

            <div style={{ marginTop: 20 }}>
              <div style={css.formGroup}>
                <label style={css.formLabel}>Your Response</label>
                <textarea style={css.formTextarea} placeholder="Share your feedback, approval, or questions…" value={respond.response} onChange={e => setRespond({ ...respond, response: e.target.value })} />
              </div>
              <div style={css.formGroup}>
                <label style={css.formLabel}>Decision</label>
                <select style={css.formSelect} value={respond.decision} onChange={e => setRespond({ ...respond, decision: e.target.value })}>
                  <option value="">Select…</option>
                  <option value="approved">Approved — looks great</option>
                  <option value="approved_with_notes">Approved with minor notes</option>
                  <option value="changes_needed">Changes needed — see feedback</option>
                </select>
              </div>
            </div>

            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={css.btnSubmit} onClick={submitResponse} disabled={saving}>{saving ? 'Submitting…' : 'Submit Response'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
