import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';

const TABS = ['Projects', 'Invoices', 'Feedback Tasks', 'Work Requests'];

export default function AdminClientDetail({ client }) {
  const [tab, setTab] = useState('Projects');

  return (
    <>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <div key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px', fontSize: 14, cursor: 'pointer', fontWeight: tab === t ? 700 : 400,
            color: tab === t ? 'var(--navy)' : 'var(--slate)',
            borderBottom: tab === t ? '2px solid var(--blue)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.14s',
          }}>{t}</div>
        ))}
      </div>

      {tab === 'Projects' && <AdminProjects clientId={client.id} />}
      {tab === 'Invoices' && <AdminInvoices clientId={client.id} />}
      {tab === 'Feedback Tasks' && <AdminFeedbackTasks clientId={client.id} />}
      {tab === 'Work Requests' && <AdminWorkRequestsDetail clientId={client.id} />}
    </>
  );
}

// ── PROJECTS ──────────────────────────────────────────────
function AdminProjects({ clientId }) {
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [projectForm, setProjectForm] = useState({ name: '', phase: '', progress_pct: 0, status: 'active' });
  const [msForm, setMsForm] = useState({ name: '', target_date: '', status: 'upcoming', sort_order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProjects(); }, [clientId]);

  const fetchProjects = async () => {
    const { data: ps } = await supabase.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    setProjects(ps || []);
    for (const p of (ps || [])) {
      const { data: ms } = await supabase.from('milestones').select('*').eq('project_id', p.id).order('sort_order');
      setMilestones(prev => ({ ...prev, [p.id]: ms || [] }));
    }
    setLoading(false);
  };

  const saveProject = async () => {
    setSaving(true);
    if (activeProject) {
      await supabase.from('projects').update(projectForm).eq('id', activeProject.id);
    } else {
      await supabase.from('projects').insert({ ...projectForm, client_id: clientId });
    }
    setModal(null); setActiveProject(null); setProjectForm({ name: '', phase: '', progress_pct: 0, status: 'active' });
    await fetchProjects(); setSaving(false);
  };

  const saveMilestone = async () => {
    setSaving(true);
    await supabase.from('milestones').insert({ ...msForm, project_id: activeProject.id });
    setModal(null); setMsForm({ name: '', target_date: '', status: 'upcoming', sort_order: 0 });
    await fetchProjects(); setSaving(false);
  };

  const updateMilestone = async (id, status) => {
    await supabase.from('milestones').update({ status }).eq('id', id);
    fetchProjects();
  };

  const deleteMilestone = async (id) => {
    await supabase.from('milestones').delete().eq('id', id);
    fetchProjects();
  };

  if (loading) return <div style={{ fontSize: 14, color: 'var(--slate)' }}>Loading…</div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button style={css.primaryBtn} onClick={() => { setActiveProject(null); setModal('project'); }}>+ New Project</button>
      </div>

      {projects.length === 0 && <div style={{ ...css.card, textAlign: 'center', color: 'var(--slate)', fontSize: 14 }}>No projects yet.</div>}

      {projects.map(p => (
        <div key={p.id} style={{ ...css.card, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 20 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 2 }}>{p.phase}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...css.secondaryBtn, padding: '6px 14px', fontSize: 13 }} onClick={() => { setActiveProject(p); setProjectForm({ name: p.name, phase: p.phase || '', progress_pct: p.progress_pct || 0, status: p.status }); setModal('project'); }}>Edit</button>
              <button style={{ ...css.primaryBtn, padding: '6px 14px', fontSize: 13 }} onClick={() => { setActiveProject(p); setModal('milestone'); }}>+ Milestone</button>
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate)', marginBottom: 6 }}>
              <span>Progress</span><span>{p.progress_pct || 0}%</span>
            </div>
            <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--blue)', width: `${p.progress_pct || 0}%` }}></div>
            </div>
          </div>

          {/* Milestones */}
          {(milestones[p.id] || []).length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--slate)', fontStyle: 'italic' }}>No milestones yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Milestone', 'Target Date', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '0 10px 10px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(milestones[p.id] || []).map(m => (
                  <tr key={m.id}>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{m.name}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{m.target_date ? new Date(m.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>
                      <select value={m.status} onChange={e => updateMilestone(m.id, e.target.value)}
                        style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit', background: 'var(--cream)' }}>
                        <option value="upcoming">Upcoming</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                      <span onClick={() => deleteMilestone(m.id)} style={{ fontSize: 12, color: 'var(--slate)', cursor: 'pointer' }}>Remove</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {/* Project Modal */}
      {modal === 'project' && (
        <div style={css.overlay} onClick={() => setModal(null)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>{activeProject ? 'Edit Project' : 'New Project'}</div>
            <div style={css.formGroup}><label style={css.formLabel}>Project Name</label><input style={css.formInput} value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="e.g. Website Redesign" /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Phase / Description</label><input style={css.formInput} value={projectForm.phase} onChange={e => setProjectForm({ ...projectForm, phase: e.target.value })} placeholder="e.g. Phase 2 of 4 — Design" /></div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Progress ({projectForm.progress_pct}%)</label>
              <input type="range" min="0" max="100" value={projectForm.progress_pct} onChange={e => setProjectForm({ ...projectForm, progress_pct: parseInt(e.target.value) })} style={{ width: '100%' }} />
            </div>
            <div style={css.formGroup}><label style={css.formLabel}>Status</label>
              <select style={css.formSelect} value={projectForm.status} onChange={e => setProjectForm({ ...projectForm, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={css.btnSubmit} onClick={saveProject} disabled={saving}>{saving ? 'Saving…' : 'Save Project'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Modal */}
      {modal === 'milestone' && (
        <div style={css.overlay} onClick={() => setModal(null)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>Add Milestone</div>
            <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 20 }}>{activeProject?.name}</div>
            <div style={css.formGroup}><label style={css.formLabel}>Milestone Name</label><input style={css.formInput} value={msForm.name} onChange={e => setMsForm({ ...msForm, name: e.target.value })} placeholder="e.g. Design Approved" /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Target Date</label><input type="date" style={css.formInput} value={msForm.target_date} onChange={e => setMsForm({ ...msForm, target_date: e.target.value })} /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Status</label>
              <select style={css.formSelect} value={msForm.status} onChange={e => setMsForm({ ...msForm, status: e.target.value })}>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div style={css.formGroup}><label style={css.formLabel}>Sort Order</label><input type="number" style={css.formInput} value={msForm.sort_order} onChange={e => setMsForm({ ...msForm, sort_order: parseInt(e.target.value) })} /></div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={css.btnSubmit} onClick={saveMilestone} disabled={saving}>{saving ? 'Saving…' : 'Add Milestone'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── INVOICES ──────────────────────────────────────────────
function AdminInvoices({ clientId }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ invoice_number: '', description: '', amount: '', status: 'due', issued_date: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchInvoices(); }, [clientId]);

  const fetchInvoices = async () => {
    const { data } = await supabase.from('invoices').select('*').eq('client_id', clientId).order('issued_date', { ascending: false });
    setInvoices(data || []);
    setLoading(false);
  };

  const saveInvoice = async () => {
    setSaving(true);
    await supabase.from('invoices').insert({ ...form, client_id: clientId, amount: parseFloat(form.amount) });
    setModal(false); setForm({ invoice_number: '', description: '', amount: '', status: 'due', issued_date: '', due_date: '' });
    await fetchInvoices(); setSaving(false);
  };

  const updateStatus = async (id, status) => {
    await supabase.from('invoices').update({ status }).eq('id', id);
    fetchInvoices();
  };

  const fmt = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (loading) return <div style={{ fontSize: 14, color: 'var(--slate)' }}>Loading…</div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button style={css.primaryBtn} onClick={() => setModal(true)}>+ New Invoice</button>
      </div>

      <div style={css.card}>
        {invoices.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--slate)', fontSize: 14, padding: '16px 0' }}>No invoices yet.</div> : (
          <table style={css.table}>
            <thead><tr>{['Invoice #', 'Description', 'Issued', 'Due', 'Amount', 'Status'].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ ...css.td, fontWeight: 700 }}>{inv.invoice_number}</td>
                  <td style={{ ...css.td, color: 'var(--slate)' }}>{inv.description}</td>
                  <td style={css.td}>{fmtDate(inv.issued_date)}</td>
                  <td style={css.td}>{fmtDate(inv.due_date)}</td>
                  <td style={{ ...css.td, fontWeight: 700 }}>{fmt(inv.amount)}</td>
                  <td style={css.td}>
                    <select value={inv.status} onChange={e => updateStatus(inv.id, e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit', background: 'var(--cream)' }}>
                      <option value="due">Due</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={css.overlay} onClick={() => setModal(false)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>New Invoice</div>
            <div style={css.formGroup}><label style={css.formLabel}>Invoice Number</label><input style={css.formInput} value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} placeholder="INV-2025-001" /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Description</label><input style={css.formInput} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Q2 Retainer" /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Amount</label><input type="number" style={css.formInput} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={css.formGroup}><label style={css.formLabel}>Issued Date</label><input type="date" style={css.formInput} value={form.issued_date} onChange={e => setForm({ ...form, issued_date: e.target.value })} /></div>
              <div style={css.formGroup}><label style={css.formLabel}>Due Date</label><input type="date" style={css.formInput} value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div style={css.formGroup}><label style={css.formLabel}>Status</label>
              <select style={css.formSelect} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="due">Due</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(false)}>Cancel</button>
              <button style={css.btnSubmit} onClick={saveInvoice} disabled={saving}>{saving ? 'Saving…' : 'Create Invoice'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── FEEDBACK TASKS ─────────────────────────────────────────
// ── FEEDBACK TASKS ─────────────────────────────────────────
function AdminFeedbackTasks({ clientId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', markup_url: '', drive_url: '', loom_url: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTasks(); }, [clientId]);

  const fetchTasks = async () => {
    const { data } = await supabase.from('feedback_tasks').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  const saveTask = async () => {
    setSaving(true);
    await supabase.from('feedback_tasks').insert({ ...form, client_id: clientId, status: 'awaiting' });
    setModal(false);
    setForm({ title: '', description: '', due_date: '', markup_url: '', drive_url: '', loom_url: '' });
    await fetchTasks();
    setSaving(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const LinkBadge = ({ url, label, color, bg }) => {
    if (!url) return null;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 12, fontWeight: 700, color, background: bg,
        borderRadius: 6, padding: '4px 10px', textDecoration: 'none',
        marginRight: 6, marginTop: 8,
      }}>
        {label} ↗
      </a>
    );
  };

  if (loading) return <div style={{ fontSize: 14, color: 'var(--slate)' }}>Loading…</div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button style={css.primaryBtn} onClick={() => setModal(true)}>+ Send Feedback Request</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tasks.length === 0 && <div style={{ ...css.card, textAlign: 'center', color: 'var(--slate)', fontSize: 14 }}>No feedback tasks yet.</div>}
        {tasks.map(task => (
          <div key={task.id} style={{ ...css.card, borderLeft: task.status === 'awaiting' ? '3px solid var(--orange)' : '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{task.title}</div>
                <div style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.5, marginBottom: 4 }}>{task.description}</div>
                <div style={{ marginBottom: 8 }}>
                  <LinkBadge url={task.markup_url} label="View on Markup.io" color="#6c42e8" bg="#f0ebff" />
                  <LinkBadge url={task.drive_url} label="Open in Drive" color="#1a73e8" bg="#e8f0fe" />
                  <LinkBadge url={task.loom_url} label="Watch Loom" color="#625df5" bg="#eeeeff" />
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>Due {fmtDate(task.due_date)} · Sent {fmtDate(task.created_at)}</div>
                {task.status === 'completed' && task.response && (
                  <div style={{ marginTop: 12, padding: 12, background: 'var(--blue-light)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Client Response</div>
                    <div style={{ fontSize: 13, color: 'var(--navy)', marginBottom: 4 }}>{task.response}</div>
                    {task.decision && <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 700 }}>{task.decision.replace(/_/g, ' ')}</div>}
                  </div>
                )}
              </div>
              <span style={{ ...css.pill, ...(task.status === 'awaiting' ? css.pill_awaiting : css.pill_paid), whiteSpace: 'nowrap' }}>
                {task.status === 'awaiting' ? 'Awaiting Response' : 'Responded'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div style={css.overlay} onClick={() => setModal(false)}>
          <div style={{ ...css.modal, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>Send Feedback Request</div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Title</label>
              <input style={css.formInput} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Review homepage copy draft" />
            </div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Description</label>
              <textarea style={css.formTextarea} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what you need the client to review or approve…" />
            </div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Due Date</label>
              <input type="date" style={css.formInput} value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--slate)', marginTop: 16, marginBottom: 14 }}>Review Links <span style={{ color: 'var(--border)', fontWeight: 400 }}>— optional</span></div>
            </div>

            <div style={css.formGroup}>
              <label style={{ ...css.formLabel, color: '#6c42e8' }}>Markup.io URL</label>
              <input style={css.formInput} value={form.markup_url} onChange={e => setForm({ ...form, markup_url: e.target.value })} placeholder="https://markup.io/v/..." />
            </div>
            <div style={css.formGroup}>
              <label style={{ ...css.formLabel, color: '#1a73e8' }}>Google Drive URL</label>
              <input style={css.formInput} value={form.drive_url} onChange={e => setForm({ ...form, drive_url: e.target.value })} placeholder="https://drive.google.com/..." />
            </div>
            <div style={css.formGroup}>
              <label style={{ ...css.formLabel, color: '#625df5' }}>Loom URL</label>
              <input style={css.formInput} value={form.loom_url} onChange={e => setForm({ ...form, loom_url: e.target.value })} placeholder="https://www.loom.com/share/..." />
            </div>

            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(false)}>Cancel</button>
              <button style={css.btnSubmit} onClick={saveTask} disabled={saving}>{saving ? 'Sending…' : 'Send Request'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── WORK REQUESTS (read only in client detail) ─────────────
function AdminWorkRequestsDetail({ clientId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRequests(); }, [clientId]);

  const fetchRequests = async () => {
    const { data } = await supabase.from('work_requests').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    await supabase.from('work_requests').update({ status }).eq('id', id);
    fetchRequests();
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  if (loading) return <div style={{ fontSize: 14, color: 'var(--slate)' }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {requests.length === 0 && <div style={{ ...css.card, textAlign: 'center', color: 'var(--slate)', fontSize: 14 }}>No work requests from this client yet.</div>}
      {requests.map(r => (
        <div key={r.id} style={{ ...css.card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{r.subject}</div>
            <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: r.detail ? 8 : 0 }}>{r.type} · {fmtDate(r.created_at)}</div>
            {r.detail && <div style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.5 }}>{r.detail}</div>}
          </div>
          <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
            style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--cream)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      ))}
    </div>
  );
}
