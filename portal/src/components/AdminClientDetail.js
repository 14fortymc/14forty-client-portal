import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';
import ProjectTimeline from './ProjectTimeline';
import ProjectOverview from './ProjectOverview';

const TABS = ['Projects', 'Invoices', 'Feedback Tasks', 'Assets', 'Work Requests', 'Account Settings'];

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;

export default function AdminClientDetail({ client, accessToken, onClientUpdate }) {
  const [tab, setTab] = useState('Projects');
  const [clientData, setClientData] = useState(client);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: client.name || '', company_name: client.company_name || '', billing_email: client.billing_email || '', billing_address: client.billing_address || '' });
  const [pwResetSent, setPwResetSent] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveClientEdit = async () => {
    setSaving(true);
    await supabase.from('clients').update(editForm).eq('id', clientData.id);
    setClientData({ ...clientData, ...editForm });
    onClientUpdate?.(editForm);
    setEditModal(false);
    setSaving(false);
  };

  const sendPasswordReset = async () => {
    console.log('[sendPasswordReset] SUPABASE_URL:', SUPABASE_URL, '| accessToken:', accessToken);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: clientData.billing_email,
          portal_url: window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to send reset email');
    } catch (err) {
      console.error('Password reset error:', err);
    }
    setPwResetSent(true);
    setTimeout(() => setPwResetSent(false), 4000);
  };

  return (
    <>
      {/* Client profile header */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 20, color: 'var(--navy)', marginBottom: 4 }}>{clientData.company_name || clientData.name}</div>
          <div style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.8 }}>
            {clientData.name && clientData.company_name && <span>{clientData.name} · </span>}
            <span>{clientData.billing_email}</span>
            {clientData.billing_address && <span> · {clientData.billing_address}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {pwResetSent && <span style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 700 }}>✓ Reset email sent</span>}
          <button onClick={sendPasswordReset} style={{ ...css.secondaryBtn, padding: '6px 12px', fontSize: 12 }}>Reset Password</button>
          <button onClick={() => setEditModal(true)} style={{ ...css.primaryBtn, padding: '6px 14px', fontSize: 13 }}>Edit Info</button>
        </div>
      </div>

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
      {tab === 'Assets' && <AdminAssets clientId={client.id} />}
      {tab === 'Work Requests' && <AdminWorkRequestsDetail clientId={client.id} />}
      {tab === 'Account Settings' && <AdminAccountSettings client={clientData} onUpdate={(updates) => { setClientData({ ...clientData, ...updates }); onClientUpdate?.(updates); }} />}

      {/* Edit Client Modal */}
      {editModal && (
        <div style={css.overlay} onClick={() => setEditModal(false)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>Edit Client Info</div>
            <div style={css.formGroup}><label style={css.formLabel}>Contact Name</label><input style={css.formInput} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Company Name</label><input style={css.formInput} value={editForm.company_name} onChange={e => setEditForm({ ...editForm, company_name: e.target.value })} /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Billing Email <span style={{ color: 'var(--slate)', fontWeight: 400 }}>— login email</span></label><input style={css.formInput} value={editForm.billing_email} onChange={e => setEditForm({ ...editForm, billing_email: e.target.value })} /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Billing Address</label><input style={css.formInput} value={editForm.billing_address} onChange={e => setEditForm({ ...editForm, billing_address: e.target.value })} /></div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setEditModal(false)}>Cancel</button>
              <button style={css.btnSubmit} onClick={saveClientEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
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
  const [activeMilestone, setActiveMilestone] = useState(null);
  const [projectForm, setProjectForm] = useState({ name: '', phase: '', progress_pct: 0, status: 'active' });
  const [msForm, setMsForm] = useState({ name: '', target_date: '', status: 'upcoming', phase_label: '', sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => { fetchProjects(); }, [clientId]);

  const fetchProjects = async () => {
    const { data: ps } = await supabase.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: true });
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
    if (activeMilestone) {
      await supabase.from('milestones').update(msForm).eq('id', activeMilestone.id);
    } else {
      const nextOrder = (milestones[activeProject.id] || []).length;
      await supabase.from('milestones').insert({ ...msForm, sort_order: nextOrder, project_id: activeProject.id });
    }
    setModal(null); setActiveMilestone(null); setMsForm({ name: '', target_date: '', status: 'upcoming', sort_order: 0 });
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

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this project and all its milestones? This cannot be undone.')) return;
    await supabase.from('milestones').delete().eq('project_id', id);
    await supabase.from('projects').delete().eq('id', id);
    fetchProjects();
  };

  const handleDrop = async (projectId) => {
    if (!dragId || !dragOverId || dragId === dragOverId) return;
    const ms = [...(milestones[projectId] || [])];
    const fromIdx = ms.findIndex(m => m.id === dragId);
    const toIdx = ms.findIndex(m => m.id === dragOverId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = ms.splice(fromIdx, 1);
    ms.splice(toIdx, 0, moved);
    setMilestones(prev => ({ ...prev, [projectId]: ms }));
    setDragId(null); setDragOverId(null);
    for (let i = 0; i < ms.length; i++) {
      await supabase.from('milestones').update({ sort_order: i }).eq('id', ms[i].id);
    }
  };

  if (loading) return <div style={{ fontSize: 14, color: 'var(--slate)' }}>Loading…</div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button style={css.primaryBtn} onClick={() => { setActiveProject(null); setModal('project'); }}>+ New Project</button>
      </div>

      {projects.length === 0 && <div style={{ ...css.card, textAlign: 'center', color: 'var(--slate)', fontSize: 14 }}>No projects yet.</div>}

      <ProjectOverview projects={projects} milestones={milestones} />

      {projects.map(p => (
        <div key={p.id} style={{ ...css.card, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 20 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 2 }}>{p.phase}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...css.secondaryBtn, padding: '6px 14px', fontSize: 13 }} onClick={() => { setActiveProject(p); setProjectForm({ name: p.name, phase: p.phase || '', progress_pct: p.progress_pct || 0, status: p.status }); setModal('project'); }}>Edit</button>
              <button style={{ ...css.primaryBtn, padding: '6px 14px', fontSize: 13 }} onClick={() => { setActiveProject(p); setActiveMilestone(null); setMsForm({ name: '', target_date: '', status: 'upcoming', phase_label: '', sort_order: 0 }); setModal('milestone'); }}>+ Milestone</button>
              <button style={{ ...css.secondaryBtn, padding: '6px 14px', fontSize: 13, color: '#c0392b', borderColor: '#e8c5c1' }} onClick={() => deleteProject(p.id)}>Delete</button>
            </div>
          </div>

          {/* Progress — auto-calculated from completed milestones */}
          {(() => {
            const ms = milestones[p.id] || [];
            const pct = ms.length > 0 ? Math.round((ms.filter(m => m.status === 'completed').length / ms.length) * 100) : 0;
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate)', marginBottom: 6 }}>
                  <span>Progress</span>
                  <span>{ms.filter(m => m.status === 'completed').length} of {ms.length} milestone{ms.length !== 1 ? 's' : ''} completed · {pct}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--blue)', width: `${pct}%`, transition: 'width 0.4s' }}></div>
                </div>
              </div>
            );
          })()}

          {/* Milestones */}
          {(milestones[p.id] || []).length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--slate)', fontStyle: 'italic' }}>No milestones yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['', 'Milestone', 'Phase', 'Target Date', 'Status', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '0 10px 10px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(milestones[p.id] || []).map(m => (
                  <tr
                    key={m.id}
                    draggable
                    onDragStart={() => setDragId(m.id)}
                    onDragOver={e => { e.preventDefault(); setDragOverId(m.id); }}
                    onDrop={() => handleDrop(p.id)}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                    style={{
                      opacity: dragId === m.id ? 0.4 : 1,
                      background: dragOverId === m.id && dragId !== m.id ? 'var(--cream)' : 'transparent',
                      transition: 'opacity 0.15s, background 0.1s',
                    }}
                  >
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--border)', cursor: 'grab', fontSize: 16, userSelect: 'none' }}>⠿</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{m.name}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>
                      {m.phase_label ? (
                        <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--border)', color: 'var(--slate)', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>{m.phase_label}</span>
                      ) : <span style={{ color: 'var(--border)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{m.target_date ? new Date(m.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>
                      <select value={m.status} onChange={e => updateMilestone(m.id, e.target.value)}
                        style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit', background: 'var(--cream)' }}>
                        <option value="upcoming">Upcoming</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span onClick={() => { setActiveProject(p); setActiveMilestone(m); setMsForm({ name: m.name, target_date: m.target_date || '', status: m.status, phase_label: m.phase_label || '', sort_order: m.sort_order || 0 }); setModal('milestone'); }} style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer', fontWeight: 600, marginRight: 14 }}>Edit</span>
                      <span onClick={() => deleteMilestone(m.id)} style={{ fontSize: 12, color: 'var(--slate)', cursor: 'pointer' }}>Remove</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Timeline — visual date-based overview */}
          <ProjectTimeline milestones={milestones[p.id] || []} />
        </div>
      ))}

      {/* Project Modal */}
      {modal === 'project' && (
        <div style={css.overlay} onClick={() => setModal(null)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>{activeProject ? 'Edit Project' : 'New Project'}</div>
            <div style={css.formGroup}><label style={css.formLabel}>Project Name</label><input style={css.formInput} value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="e.g. Website Redesign" /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Phase / Description</label><input style={css.formInput} value={projectForm.phase} onChange={e => setProjectForm({ ...projectForm, phase: e.target.value })} placeholder="e.g. Phase 2 of 4 — Design" /></div>
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

      {/* Milestone Modal — add or edit */}
      {modal === 'milestone' && (
        <div style={css.overlay} onClick={() => { setModal(null); setActiveMilestone(null); }}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>{activeMilestone ? 'Edit Milestone' : 'Add Milestone'}</div>
            <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 20 }}>{activeProject?.name}</div>
            <div style={css.formGroup}><label style={css.formLabel}>Milestone Name</label><input style={css.formInput} value={msForm.name} onChange={e => setMsForm({ ...msForm, name: e.target.value })} placeholder="e.g. Design Approved" /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Phase Label</label><input style={css.formInput} value={msForm.phase_label} onChange={e => setMsForm({ ...msForm, phase_label: e.target.value })} placeholder="e.g. Phase 1, Brand Discovery" /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Target Date</label><input type="date" style={css.formInput} value={msForm.target_date} onChange={e => setMsForm({ ...msForm, target_date: e.target.value })} /></div>
            <div style={css.formGroup}><label style={css.formLabel}>Status</label>
              <select style={css.formSelect} value={msForm.status} onChange={e => setMsForm({ ...msForm, status: e.target.value })}>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => { setModal(null); setActiveMilestone(null); }}>Cancel</button>
              <button style={css.btnSubmit} onClick={saveMilestone} disabled={saving}>{saving ? 'Saving…' : activeMilestone ? 'Save Changes' : 'Add Milestone'}</button>
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
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [form, setForm] = useState({ invoice_number: '', description: '', amount: '', status: 'due', issued_date: '', due_date: '' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchInvoices(); }, [clientId]);

  const fetchInvoices = async () => {
    const { data } = await supabase.from('invoices').select('*').eq('client_id', clientId).order('issued_date', { ascending: false });
    setInvoices(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setActiveInvoice(null);
    setForm({ invoice_number: '', description: '', amount: '', status: 'due', issued_date: '', due_date: '' });
    setModal(true);
  };

  const openEdit = (inv) => {
    setActiveInvoice(inv);
    setForm({ invoice_number: inv.invoice_number, description: inv.description || '', amount: String(inv.amount), status: inv.status, issued_date: inv.issued_date || '', due_date: inv.due_date || '' });
    setModal(true);
  };

  const saveInvoice = async () => {
    setSaving(true);
    const payload = { ...form, amount: parseFloat(form.amount) };
    if (activeInvoice) {
      await supabase.from('invoices').update(payload).eq('id', activeInvoice.id);
    } else {
      await supabase.from('invoices').insert({ ...payload, client_id: clientId });
    }
    setModal(false); setActiveInvoice(null);
    setForm({ invoice_number: '', description: '', amount: '', status: 'due', issued_date: '', due_date: '' });
    await fetchInvoices(); setSaving(false);
  };

  const deleteInvoice = async (id) => {
    await supabase.from('invoices').delete().eq('id', id);
    setDeleteConfirm(null);
    fetchInvoices();
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
        <button style={css.primaryBtn} onClick={openCreate}>+ New Invoice</button>
      </div>

      <div style={css.card}>
        {invoices.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--slate)', fontSize: 14, padding: '16px 0' }}>No invoices yet.</div> : (
          <table style={css.table}>
            <thead><tr>{['Invoice #', 'Description', 'Issued', 'Due', 'Amount', 'Status', ''].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
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
                  <td style={{ ...css.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span onClick={() => openEdit(inv)} style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer', marginRight: 12, fontWeight: 600 }}>Edit</span>
                    {deleteConfirm === inv.id ? (
                      <span>
                        <span style={{ fontSize: 12, color: '#dc2626', marginRight: 6 }}>Delete?</span>
                        <span onClick={() => deleteInvoice(inv.id)} style={{ fontSize: 12, color: '#dc2626', cursor: 'pointer', fontWeight: 700, marginRight: 8 }}>Yes</span>
                        <span onClick={() => setDeleteConfirm(null)} style={{ fontSize: 12, color: 'var(--slate)', cursor: 'pointer' }}>No</span>
                      </span>
                    ) : (
                      <span onClick={() => setDeleteConfirm(inv.id)} style={{ fontSize: 12, color: 'var(--slate)', cursor: 'pointer' }}>Delete</span>
                    )}
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
            <div style={css.modalTitle}>{activeInvoice ? 'Edit Invoice' : 'New Invoice'}</div>
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
              <button style={css.btnSubmit} onClick={saveInvoice} disabled={saving}>{saving ? 'Saving…' : activeInvoice ? 'Save Changes' : 'Create Invoice'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── FEEDBACK TASKS ─────────────────────────────────────────
function AdminFeedbackTasks({ clientId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', markup_url: '', drive_url: '', loom_url: '' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchTasks(); }, [clientId]);

  const fetchTasks = async () => {
    const { data } = await supabase.from('feedback_tasks').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setActiveTask(null);
    setForm({ title: '', description: '', due_date: '', markup_url: '', drive_url: '', loom_url: '' });
    setModal(true);
  };

  const openEdit = (task) => {
    setActiveTask(task);
    setForm({ title: task.title, description: task.description || '', due_date: task.due_date || '', markup_url: task.markup_url || '', drive_url: task.drive_url || '', loom_url: task.loom_url || '' });
    setModal(true);
  };

  const saveTask = async () => {
    setSaving(true);
    if (activeTask) {
      await supabase.from('feedback_tasks').update(form).eq('id', activeTask.id);
    } else {
      await supabase.from('feedback_tasks').insert({ ...form, client_id: clientId, status: 'awaiting' });
    }
    setModal(false); setActiveTask(null);
    setForm({ title: '', description: '', due_date: '', markup_url: '', drive_url: '', loom_url: '' });
    await fetchTasks();
    setSaving(false);
  };

  const deleteTask = async (id) => {
    await supabase.from('feedback_tasks').delete().eq('id', id);
    setDeleteConfirm(null);
    fetchTasks();
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
        <button style={css.primaryBtn} onClick={openCreate}>+ Send Feedback Request</button>
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <span style={{ ...css.pill, ...(task.status === 'awaiting' ? css.pill_awaiting : css.pill_paid), whiteSpace: 'nowrap' }}>
                  {task.status === 'awaiting' ? 'Awaiting Response' : 'Responded'}
                </span>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span onClick={() => openEdit(task)} style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}>Edit</span>
                  {deleteConfirm === task.id ? (
                    <span>
                      <span style={{ fontSize: 12, color: '#dc2626', marginRight: 6 }}>Delete?</span>
                      <span onClick={() => deleteTask(task.id)} style={{ fontSize: 12, color: '#dc2626', cursor: 'pointer', fontWeight: 700, marginRight: 8 }}>Yes</span>
                      <span onClick={() => setDeleteConfirm(null)} style={{ fontSize: 12, color: 'var(--slate)', cursor: 'pointer' }}>No</span>
                    </span>
                  ) : (
                    <span onClick={() => setDeleteConfirm(task.id)} style={{ fontSize: 12, color: 'var(--slate)', cursor: 'pointer' }}>Delete</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div style={css.overlay} onClick={() => setModal(false)}>
          <div style={{ ...css.modal, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>{activeTask ? 'Edit Feedback Request' : 'Send Feedback Request'}</div>
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
              <button style={css.btnSubmit} onClick={saveTask} disabled={saving}>{saving ? 'Saving…' : activeTask ? 'Save Changes' : 'Send Request'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── ASSETS ─────────────────────────────────────────────────
function AdminAssets({ clientId }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folderPath, setFolderPath] = useState('/');
  const [modal, setModal] = useState(null); // null | 'file' | 'folder'
  const [form, setForm] = useState({ name: '', file_type: 'pdf', drive_url: '' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('assets').select('*').eq('client_id', clientId).eq('folder_path', folderPath).order('is_folder', { ascending: false }).order('name', { ascending: true });
    setAssets(data || []);
    setLoading(false);
  }, [clientId, folderPath]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const createFolder = async () => {
    setSaving(true);
    await supabase.from('assets').insert({ client_id: clientId, name: form.name, is_folder: true, folder_path: folderPath, file_type: 'folder' });
    setModal(null); setForm({ name: '', file_type: 'pdf', drive_url: '' });
    await fetchAssets(); setSaving(false);
  };

  const createFile = async () => {
    setSaving(true);
    await supabase.from('assets').insert({ client_id: clientId, name: form.name, drive_url: form.drive_url, file_type: form.file_type, folder_path: folderPath, is_folder: false });
    setModal(null); setForm({ name: '', file_type: 'pdf', drive_url: '' });
    await fetchAssets(); setSaving(false);
  };

  const deleteAsset = async (id) => {
    await supabase.from('assets').delete().eq('id', id);
    setDeleteConfirm(null);
    fetchAssets();
  };

  const navigateInto = (folderName) => {
    setFolderPath(folderPath === '/' ? `/${folderName}/` : `${folderPath}${folderName}/`);
  };

  const breadcrumbs = folderPath === '/' ? ['/'] : ['/', ...folderPath.replace(/^\/|\/$/g, '').split('/')];

  const navigateTo = (index) => {
    if (index === 0) { setFolderPath('/'); return; }
    const parts = folderPath.replace(/^\/|\/$/g, '').split('/');
    setFolderPath('/' + parts.slice(0, index).join('/') + '/');
  };

  const fileTypeIcon = (type) => ({ folder: '📁', pdf: '📄', zip: '🗜', figma: '🎨', jpg: '🖼', png: '🖼', gif: '🖼', webp: '🖼', svg: '🖼', doc: '📝', docx: '📝', mp4: '🎬', mov: '🎬', other: '📎' }[type] || '📎');

  if (loading) return <div style={{ fontSize: 14, color: 'var(--slate)' }}>Loading…</div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--slate)' }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <span style={{ color: 'var(--border)' }}>/</span>}
              <span onClick={() => navigateTo(i === 0 ? 0 : i)} style={{ cursor: i < breadcrumbs.length - 1 ? 'pointer' : 'default', color: i < breadcrumbs.length - 1 ? 'var(--blue)' : 'var(--navy)', fontWeight: i === breadcrumbs.length - 1 ? 700 : 400 }}>
                {crumb === '/' ? 'Root' : crumb}
              </span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...css.secondaryBtn, padding: '6px 14px', fontSize: 13 }} onClick={() => { setForm({ name: '', file_type: 'pdf', drive_url: '' }); setModal('folder'); }}>+ Folder</button>
          <button style={css.primaryBtn} onClick={() => { setForm({ name: '', file_type: 'pdf', drive_url: '' }); setModal('file'); }}>+ Add File</button>
        </div>
      </div>

      <div style={css.card}>
        {assets.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--slate)', fontSize: 14, padding: '24px 0' }}>
            {folderPath === '/' ? 'No assets yet. Add a file or folder to get started.' : 'This folder is empty.'}
          </div>
        ) : (
          <table style={css.table}>
            <thead><tr>{['Name', 'Type', ''].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id}>
                  <td style={{ ...css.td, fontWeight: asset.is_folder ? 700 : 400 }}>
                    <span style={{ marginRight: 8 }}>{fileTypeIcon(asset.file_type)}</span>
                    {asset.is_folder ? (
                      <span onClick={() => navigateInto(asset.name)} style={{ cursor: 'pointer', color: 'var(--navy)' }}>{asset.name}</span>
                    ) : asset.drive_url ? (
                      <a href={asset.drive_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'none' }}>{asset.name} ↗</a>
                    ) : (
                      <span>{asset.name}</span>
                    )}
                  </td>
                  <td style={{ ...css.td, color: 'var(--slate)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{asset.is_folder ? 'Folder' : asset.file_type}</td>
                  <td style={{ ...css.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {deleteConfirm === asset.id ? (
                      <span>
                        <span style={{ fontSize: 12, color: '#dc2626', marginRight: 6 }}>Delete?</span>
                        <span onClick={() => deleteAsset(asset.id)} style={{ fontSize: 12, color: '#dc2626', cursor: 'pointer', fontWeight: 700, marginRight: 8 }}>Yes</span>
                        <span onClick={() => setDeleteConfirm(null)} style={{ fontSize: 12, color: 'var(--slate)', cursor: 'pointer' }}>No</span>
                      </span>
                    ) : (
                      <span onClick={() => setDeleteConfirm(asset.id)} style={{ fontSize: 12, color: 'var(--slate)', cursor: 'pointer' }}>Delete</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Folder Modal */}
      {modal === 'folder' && (
        <div style={css.overlay} onClick={() => setModal(null)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>New Folder</div>
            <div style={css.formGroup}><label style={css.formLabel}>Folder Name</label><input style={css.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Brand Assets" autoFocus /></div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={css.btnSubmit} onClick={createFolder} disabled={saving || !form.name}>{saving ? 'Creating…' : 'Create Folder'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add File Modal */}
      {modal === 'file' && (
        <div style={css.overlay} onClick={() => setModal(null)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>Add File</div>
            <div style={css.formGroup}><label style={css.formLabel}>File Name</label><input style={css.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Brand Guidelines.pdf" /></div>
            <div style={css.formGroup}><label style={css.formLabel}>File Type</label>
              <select style={css.formSelect} value={form.file_type} onChange={e => setForm({ ...form, file_type: e.target.value })}>
                <option value="pdf">PDF</option>
                <option value="figma">Figma</option>
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="gif">GIF</option>
                <option value="webp">WebP</option>
                <option value="svg">SVG</option>
                <option value="mp4">MP4</option>
                <option value="mov">MOV</option>
                <option value="zip">ZIP</option>
                <option value="doc">DOC</option>
                <option value="docx">DOCX</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={css.formGroup}><label style={css.formLabel}>Google Drive URL</label><input style={css.formInput} value={form.drive_url} onChange={e => setForm({ ...form, drive_url: e.target.value })} placeholder="https://drive.google.com/..." /></div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={css.btnSubmit} onClick={createFile} disabled={saving || !form.name}>{saving ? 'Adding…' : 'Add File'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── WORK REQUESTS ─────────────────────────────────────────
function AdminWorkRequestsDetail({ clientId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actualHoursEdit, setActualHoursEdit] = useState({});

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

  const saveActualHours = async (id) => {
    const hrs = parseFloat(actualHoursEdit[id]);
    if (isNaN(hrs)) return;
    await supabase.from('work_requests').update({ actual_hours: hrs }).eq('id', id);
    setActualHoursEdit(prev => { const n = { ...prev }; delete n[id]; return n; });
    fetchRequests();
  };

  const deleteRequest = async (id) => {
    await supabase.from('work_requests').delete().eq('id', id);
    setDeleteConfirm(null);
    fetchRequests();
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
    return <span style={{ ...css.pill, ...styles[billing_type] }}>{labels[billing_type]}</span>;
  };

  if (loading) return <div style={{ fontSize: 14, color: 'var(--slate)' }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {requests.length === 0 && <div style={{ ...css.card, textAlign: 'center', color: 'var(--slate)', fontSize: 14 }}>No work requests from this client yet.</div>}
      {requests.map(r => (
        <div key={r.id} style={{ ...css.card, gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{r.subject}</div>
              <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: r.detail ? 8 : 0 }}>
                {r.request_category === 'website_update' ? 'Website Update' : r.request_category === 'ad_hoc' ? 'Ad Hoc Work' : ''}
                {r.type ? ` · ${r.type}` : ''}
                {' · '}{fmtDate(r.created_at)}
              </div>
              {r.detail && <div style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.5 }}>{r.detail}</div>}
              {r.asana_task_url && (
                <div style={{ marginTop: 6 }}>
                  <a href={r.asana_task_url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 12, fontWeight: 700, color: '#f06a35', background: '#fff4f0',
                    borderRadius: 6, padding: '4px 10px', textDecoration: 'none',
                    border: '1px solid #f06a3522',
                  }}>
                    View in Asana ↗
                  </a>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {billingBadge(r.billing_type)}
                <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                  style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--cream)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <option value="open">Open</option>
                  <option value="on_hold">On Hold</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              {deleteConfirm === r.id ? (
                <span>
                  <span style={{ fontSize: 12, color: '#dc2626', marginRight: 6 }}>Delete?</span>
                  <span onClick={() => deleteRequest(r.id)} style={{ fontSize: 12, color: '#dc2626', cursor: 'pointer', fontWeight: 700, marginRight: 8 }}>Yes</span>
                  <span onClick={() => setDeleteConfirm(null)} style={{ fontSize: 12, color: 'var(--slate)', cursor: 'pointer' }}>No</span>
                </span>
              ) : (
                <span onClick={() => setDeleteConfirm(r.id)} style={{ fontSize: 12, color: 'var(--slate)', cursor: 'pointer' }}>Delete</span>
              )}
            </div>
          </div>

          {/* Log actual hours */}
          {r.status === 'completed' && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 700 }}>Actual Hours:</span>
              {r.actual_hours != null && actualHoursEdit[r.id] === undefined ? (
                <>
                  <span style={{ fontSize: 13 }}>{r.actual_hours} hrs</span>
                  <span onClick={() => setActualHoursEdit(prev => ({ ...prev, [r.id]: String(r.actual_hours) }))} style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}>Edit</span>
                </>
              ) : (
                <>
                  <input
                    type="number" step="0.25" min="0"
                    placeholder="0.00"
                    value={actualHoursEdit[r.id] ?? ''}
                    onChange={e => setActualHoursEdit(prev => ({ ...prev, [r.id]: e.target.value }))}
                    style={{ width: 80, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontFamily: 'inherit', background: 'var(--cream)' }}
                  />
                  <button onClick={() => saveActualHours(r.id)} style={{ ...css.payBtn, padding: '4px 12px', fontSize: 12 }}>Save</button>
                  {r.actual_hours != null && <span onClick={() => setActualHoursEdit(prev => { const n = { ...prev }; delete n[r.id]; return n; })} style={{ fontSize: 12, color: 'var(--slate)', cursor: 'pointer' }}>Cancel</span>}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── ACCOUNT SETTINGS ──────────────────────────────────────
function AdminAccountSettings({ client, onUpdate }) {
  const [form, setForm] = useState({
    hosting_package: client.hosting_package || 'none',
    service_agreement: client.service_agreement || false,
    service_agreement_monthly_rate: client.service_agreement_monthly_rate || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    const updates = {
      hosting_package: form.hosting_package,
      service_agreement: form.service_agreement,
      service_agreement_monthly_rate: form.service_agreement && form.service_agreement_monthly_rate !== '' ? parseInt(form.service_agreement_monthly_rate, 10) : null,
    };
    await supabase.from('clients').update(updates).eq('id', client.id);
    onUpdate(updates);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 20, marginBottom: 4 }}>Account Settings</div>
        <div style={{ fontSize: 13, color: 'var(--slate)' }}>Configure this client's hosting package and service agreement.</div>
      </div>

      <div style={css.card}>
        <div style={css.formGroup}>
          <label style={css.formLabel}>Hosting Package</label>
          <select
            style={css.formSelect}
            value={form.hosting_package}
            onChange={e => setForm({ ...form, hosting_package: e.target.value })}
          >
            <option value="none">None</option>
            <option value="essential">Essential ($50/mo)</option>
            <option value="basic">Basic ($110/mo)</option>
            <option value="advanced">Advanced ($275/mo — includes 3 hrs/mo)</option>
          </select>
        </div>

        <div style={{ ...css.formGroup, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...css.formLabel, marginBottom: 2 }}>Service Agreement</div>
            <div style={{ fontSize: 12, color: 'var(--slate)' }}>Monthly flat-rate agreement covering ad hoc work</div>
          </div>
          <button
            onClick={() => setForm({ ...form, service_agreement: !form.service_agreement })}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: form.service_agreement ? 'var(--blue)' : 'var(--border)',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: form.service_agreement ? 22 : 3,
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s', display: 'block',
            }} />
          </button>
        </div>

        {form.service_agreement && (
          <div style={css.formGroup}>
            <label style={css.formLabel}>Monthly Rate (USD)</label>
            <input
              type="number" min="0" placeholder="e.g. 500"
              style={css.formInput}
              value={form.service_agreement_monthly_rate}
              onChange={e => setForm({ ...form, service_agreement_monthly_rate: e.target.value })}
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 8 }}>
          {saved && <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 700 }}>✓ Saved</span>}
          <button style={css.primaryBtn} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
