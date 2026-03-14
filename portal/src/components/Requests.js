import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';

export default function Requests({ clientId }) {
  const [tasks, setTasks] = useState([]);
  const [workRequests, setWorkRequests] = useState([]);
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [requestCategory, setRequestCategory] = useState(''); // 'website_update' | 'ad_hoc'
  const [form, setForm] = useState({ request_type: '', subject: '', detail: '' });
  const [respond, setRespond] = useState({ response: '', decision: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, [clientId]);

  const fetchAll = async () => {
    const [{ data: t }, { data: w }, { data: c }] = await Promise.all([
      supabase.from('feedback_tasks').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('work_requests').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('clients').select('hosting_package, service_agreement, name, company_name').eq('id', clientId).single(),
    ]);
    setTasks(t || []);
    setWorkRequests(w || []);
    setClientInfo(c || { hosting_package: 'none', service_agreement: false });
    setLoading(false);
  };

  const computeBillingType = () => {
    if (requestCategory === 'website_update') {
      return clientInfo?.hosting_package === 'advanced' ? 'included' : 'hourly';
    }
    // ad_hoc
    return clientInfo?.service_agreement ? 'flat_rate' : 'hourly';
  };

  const submitWorkRequest = async () => {
    if (!form.subject || !requestCategory) return;
    setSaving(true);
    const billing_type = computeBillingType();
    const { data: inserted } = await supabase.from('work_requests').insert({
      client_id: clientId,
      request_category: requestCategory,
      type: form.request_type,
      subject: form.subject,
      detail: form.detail,
      billing_type,
      hourly_rate: 125,
    }).select('id').single();

    // Fire-and-forget Asana task creation — don't block submission if it fails
    if (inserted?.id) {
      const client_name = clientInfo?.company_name || clientInfo?.name || '';
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      fetch(`${supabaseUrl}/functions/v1/create-asana-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_request_id: inserted.id,
          client_name,
          subject: form.subject,
          request_category: requestCategory,
          request_type: form.request_type,
          billing_type,
          description: form.detail,
          portal_url: window.location.origin,
        }),
      }).catch(err => console.error('Asana task creation failed:', err));
    }

    setModal(null);
    setRequestCategory('');
    setForm({ request_type: '', subject: '', detail: '' });
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

  const billingBadge = (billing_type) => {
    if (!billing_type) return null;
    const styles = {
      included: { background: 'var(--blue-light)', color: 'var(--blue)' },
      hourly: { background: 'var(--orange-light)', color: 'var(--orange)' },
      flat_rate: { background: '#dcfce7', color: '#16a34a' },
    };
    const labels = { included: 'Included', hourly: 'Hourly', flat_rate: 'Flat Rate' };
    return (
      <span style={{ ...css.pill, ...styles[billing_type] }}>{labels[billing_type]}</span>
    );
  };

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

  const pkg = clientInfo?.hosting_package || 'none';

  const websiteUpdateNote = pkg === 'advanced'
    ? 'Content updates are included up to 3 hrs/month. Additional time is billed at $125/hr.'
    : 'Website updates are billed at $125/hr with a 1-hour minimum.';

  const adHocNote = 'Ad hoc work is billed at $125/hr unless covered under a service agreement.';

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

      {/* SUBMIT A REQUEST */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 22 }}>Submit a Request</div>
          <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 2 }}>Tell us what you need and we'll get back to you</div>
        </div>

        <div style={css.card}>
          {/* Step 1: Category */}
          <div style={css.formGroup}>
            <label style={css.formLabel}>What type of request is this?</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { value: 'website_update', label: 'Website Update', sub: 'Content, bugs, new pages' },
                { value: 'ad_hoc', label: 'Ad Hoc Work', sub: 'Marketing, design, copy, other' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setRequestCategory(opt.value); setForm({ request_type: '', subject: '', detail: '' }); }}
                  style={{
                    flex: 1, textAlign: 'left', border: requestCategory === opt.value ? '2px solid var(--blue)' : '1px solid var(--border)',
                    borderRadius: 8, padding: '12px 16px', background: requestCategory === opt.value ? 'var(--blue-light)' : 'var(--white)',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate)' }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Form based on category */}
          {requestCategory && (
            <>
              <div style={css.formGroup}>
                <label style={css.formLabel}>Request Type</label>
                <select style={css.formSelect} value={form.request_type} onChange={e => setForm({ ...form, request_type: e.target.value })}>
                  <option value="">Select…</option>
                  {requestCategory === 'website_update' ? (
                    <>
                      <option value="Content Update">Content Update</option>
                      <option value="Plugin Issue / Bug Fix">Plugin Issue / Bug Fix</option>
                      <option value="New Page Request">New Page Request</option>
                    </>
                  ) : (
                    <>
                      <option value="General Ad Hoc Work">General Ad Hoc Work</option>
                      <option value="Design Request">Design Request</option>
                      <option value="Copy Edit">Copy Edit</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>
              </div>

              <div style={css.formGroup}>
                <label style={css.formLabel}>Subject</label>
                <input
                  style={css.formInput}
                  placeholder="Brief description of what you need…"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                />
              </div>

              <div style={css.formGroup}>
                <label style={css.formLabel}>Description / Details</label>
                <textarea
                  style={css.formTextarea}
                  placeholder="Add any context, links, or reference materials…"
                  value={form.detail}
                  onChange={e => setForm({ ...form, detail: e.target.value })}
                />
              </div>

              {/* Billing note */}
              <div style={{ background: 'var(--blue-light)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'var(--navy)', marginBottom: 16, lineHeight: 1.5 }}>
                {requestCategory === 'website_update' ? websiteUpdateNote : adHocNote}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  style={{ ...css.primaryBtn, opacity: !form.subject ? 0.6 : 1 }}
                  onClick={submitWorkRequest}
                  disabled={saving || !form.subject}
                >
                  {saving ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* PAST REQUESTS */}
      <div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 22 }}>Past Requests</div>
          <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 2 }}>Your previously submitted requests</div>
        </div>
        {workRequests.length === 0 ? (
          <div style={css.card}><div style={css.empty}>No requests submitted yet.</div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {workRequests.map(r => (
              <div key={r.id} style={{ ...css.card, padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{r.subject}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                      {r.request_category === 'website_update' ? 'Website Update' : r.request_category === 'ad_hoc' ? 'Ad Hoc Work' : ''}
                      {r.type ? ` · ${r.type}` : ''}
                      {' · '}Submitted {fmtDate(r.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {billingBadge(r.billing_type)}
                    <span style={{ ...css.pill, ...(r.status === 'completed' ? css.pill_paid : r.status === 'in_progress' ? css.pill_awaiting : r.status === 'on_hold' ? css.pill_on_hold : r.status === 'rejected' ? css.pill_rejected : css.pill_due) }}>
                      {r.status === 'in_progress' ? 'In Progress' : r.status === 'on_hold' ? 'On Hold' : r.status === 'rejected' ? 'Rejected' : r.status === 'completed' ? 'Completed' : 'Open'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
