import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';

export default function Home({ clientId, clientName, setTab }) {
  const [invoices, setInvoices] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState({});
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    fetchAll();
  }, [clientId]);

  const fetchAll = async () => {
    const [invRes, tasksRes, reqsRes, projsRes, assetsRes] = await Promise.all([
      supabase.from('invoices').select('*').eq('client_id', clientId).order('issued_date', { ascending: false }),
      supabase.from('feedback_tasks').select('*').eq('client_id', clientId).eq('status', 'awaiting'),
      supabase.from('work_requests').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(5),
      supabase.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('assets').select('*').eq('client_id', clientId).eq('is_folder', false).order('created_at', { ascending: false }).limit(6),
    ]);

    const projs = projsRes.data || [];
    setInvoices(invRes.data || []);
    setTasks(tasksRes.data || []);
    setRequests(reqsRes.data || []);
    setProjects(projs);
    setAssets(assetsRes.data || []);

    if (projs.length) {
      const { data: msData } = await supabase
        .from('milestones')
        .select('*')
        .in('project_id', projs.map(p => p.id));
      const grouped = {};
      for (const m of (msData || [])) {
        if (!grouped[m.project_id]) grouped[m.project_id] = [];
        grouped[m.project_id].push(m);
      }
      setMilestones(grouped);
    }
    setLoading(false);
  };

  if (loading) return <div style={{ color: 'var(--slate)', fontSize: 14, padding: '40px 0' }}>Loading…</div>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const outstanding = invoices
    .filter(i => i.status === 'due' || i.status === 'pending')
    .reduce((s, i) => s + (i.amount || 0), 0);
  const activeProjects = projects.filter(p => p.status === 'active');
  const openRequests = requests.filter(r => r.status !== 'completed');

  const fmtCurrency = n =>
    '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = d =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

  const fileIcon = type => {
    if (!type) return '📎';
    if (type.includes('pdf')) return '📄';
    if (type.match(/image|jpg|jpeg|png|gif|svg|webp/)) return '🖼';
    if (type.match(/video|mp4|mov|avi/)) return '🎬';
    if (type.match(/word|doc/)) return '📝';
    if (type.match(/sheet|excel|csv/)) return '📊';
    if (type.match(/zip|archive|tar/)) return '🗜';
    if (type.match(/ppt|presentation/)) return '📋';
    return '📎';
  };

  const STAT_CARDS = [
    {
      label: 'Outstanding Balance',
      value: fmtCurrency(outstanding),
      sub: outstanding > 0 ? 'Balance due — click to pay' : 'You\'re all caught up',
      key: 'invoices',
      accent: outstanding > 0 ? 'var(--orange)' : 'var(--blue)',
      alert: outstanding > 0,
    },
    {
      label: 'Tasks Awaiting You',
      value: tasks.length,
      sub: tasks.length === 0
        ? 'Nothing pending right now'
        : tasks.length === 1
        ? '1 item needs your review'
        : `${tasks.length} items need your review`,
      key: 'requests',
      accent: tasks.length > 0 ? '#7c5cbf' : 'var(--slate)',
      alert: tasks.length > 0,
    },
    {
      label: 'Active Projects',
      value: activeProjects.length,
      sub: activeProjects.length > 0 ? activeProjects[0].name : 'No active projects',
      key: 'projects',
      accent: 'var(--blue)',
      alert: false,
    },
    {
      label: 'Open Requests',
      value: openRequests.length,
      sub: openRequests.length > 0 ? 'In progress with 14Forty' : 'No open requests',
      key: 'requests',
      accent: openRequests.length > 0 ? 'var(--orange)' : 'var(--slate)',
      alert: false,
    },
  ];

  return (
    <div>
      {/* ── Greeting ── */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 34, color: 'var(--navy)', lineHeight: 1.1 }}>
            {greeting}, {clientName}.
          </div>
          <div style={{ fontSize: 14, color: 'var(--slate)', marginTop: 6 }}>Here's your overview for today.</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--slate)', textAlign: 'right', paddingBottom: 2 }}>{today}</div>
      </div>

      {/* ── Bento Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>

        {/* STAT CARDS — 4 across */}
        {STAT_CARDS.map((s, i) => (
          <div
            key={i}
            onClick={() => setTab(s.key)}
            style={{
              ...css.card,
              padding: '20px 22px',
              cursor: 'pointer',
              borderTop: `3px solid ${s.accent}`,
              transition: 'transform 0.15s, box-shadow 0.15s',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(30,41,59,0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'var(--shadow)';
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--slate)', marginBottom: 10 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 32, color: 'var(--navy)', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: s.alert ? s.accent : 'var(--slate)', marginTop: 7, fontWeight: s.alert ? 600 : 400 }}>
              {s.sub}
            </div>
          </div>
        ))}

        {/* ── INVOICES — span 2 ── */}
        <div style={{ ...css.card, gridColumn: 'span 2', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={css.cardTitle}>Recent Invoices</div>
            <span
              onClick={() => setTab('invoices')}
              style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}
            >
              View all →
            </span>
          </div>
          {invoices.length === 0 ? (
            <EmptyState icon="🧾" text="No invoices yet." />
          ) : (
            invoices.slice(0, 4).map(inv => (
              <div
                key={inv.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--border)', gap: 12 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{inv.invoice_number}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.description}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {inv.due_date && (
                    <div style={{ fontSize: 11, color: 'var(--slate)', whiteSpace: 'nowrap' }}>
                      Due {fmtDate(inv.due_date)}
                    </div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', minWidth: 64, textAlign: 'right' }}>
                    {fmtCurrency(inv.amount || 0)}
                  </div>
                  <span style={{
                    ...css.pill,
                    ...(inv.status === 'paid' ? css.pill_paid : inv.status === 'due' ? css.pill_due : css.pill_pending),
                  }}>
                    {inv.status === 'paid' ? 'Paid' : inv.status === 'due' ? 'Due' : 'Pending'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── MY TASKS — span 2 ── */}
        <div style={{ ...css.card, gridColumn: 'span 2', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={css.cardTitle}>My Tasks</div>
            <span
              onClick={() => setTab('requests')}
              style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}
            >
              View all →
            </span>
          </div>
          {tasks.length === 0 ? (
            <EmptyState icon="✓" text="All caught up — no tasks need your attention." green />
          ) : (
            tasks.slice(0, 4).map(t => (
              <div
                key={t.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--border)', gap: 12 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </div>
                  {t.due_date && (
                    <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>Due {fmtDate(t.due_date)}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {t.markup_url && (
                    <a href={t.markup_url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none', padding: '3px 8px', border: '1px solid var(--blue)', borderRadius: 4 }}
                      onClick={e => e.stopPropagation()}>
                      Markup
                    </a>
                  )}
                  {t.drive_url && (
                    <a href={t.drive_url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none', padding: '3px 8px', border: '1px solid var(--blue)', borderRadius: 4 }}
                      onClick={e => e.stopPropagation()}>
                      Drive
                    </a>
                  )}
                  {t.loom_url && (
                    <a href={t.loom_url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none', padding: '3px 8px', border: '1px solid var(--blue)', borderRadius: 4 }}
                      onClick={e => e.stopPropagation()}>
                      Video
                    </a>
                  )}
                  <span style={{ ...css.pill, ...css.pill_awaiting }}>Awaiting</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── PROJECT STATUS — span 2 ── */}
        <div style={{ ...css.card, gridColumn: 'span 2', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={css.cardTitle}>Project Status</div>
            <span
              onClick={() => setTab('projects')}
              style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}
            >
              View details →
            </span>
          </div>
          {projects.length === 0 ? (
            <EmptyState icon="🚀" text="No projects yet." />
          ) : (
            projects.map((p, idx) => {
              const ms = milestones[p.id] || [];
              const done = ms.filter(m => m.status === 'completed').length;
              const pct = ms.length ? Math.round((done / ms.length) * 100) : 0;
              const nextMilestone = ms
                .filter(m => m.status === 'upcoming' || m.status === 'active')
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0];
              return (
                <div
                  key={p.id}
                  style={{
                    paddingBottom: idx < projects.length - 1 ? 16 : 0,
                    marginBottom: idx < projects.length - 1 ? 16 : 0,
                    borderBottom: idx < projects.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{p.name}</div>
                      {p.phase && (
                        <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 1 }}>{p.phase}</div>
                      )}
                    </div>
                    <span style={{
                      ...css.pill,
                      ...(p.status === 'completed' ? css.pill_completed : p.status === 'active' ? css.pill_in_progress : css.pill_pending),
                      marginLeft: 10, flexShrink: 0,
                    }}>
                      {p.status === 'active' ? 'Active' : p.status === 'completed' ? 'Complete' : 'On Hold'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--blue)', borderRadius: 3, width: `${pct}%`, transition: 'width 0.5s ease' }}></div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--slate)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {pct}% · {done}/{ms.length}
                    </div>
                  </div>
                  {nextMilestone && (
                    <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 5 }}>
                      Next: <span style={{ color: 'var(--navy)', fontWeight: 600 }}>{nextMilestone.name}</span>
                      {nextMilestone.target_date && ` — ${fmtDate(nextMilestone.target_date)}`}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── 14FORTY REQUESTS — span 1 ── */}
        <div style={{ ...css.card, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={css.cardTitle}>14Forty Requests</div>
            <span
              onClick={() => setTab('requests')}
              style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}
            >
              All →
            </span>
          </div>
          <div style={{ flex: 1 }}>
            {requests.length === 0 ? (
              <EmptyState icon="📬" text="No requests yet." />
            ) : (
              requests.map(r => (
                <div key={r.id} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.subject}
                    </div>
                    <span style={{
                      ...css.pill,
                      ...(r.status === 'completed' ? css.pill_completed : r.status === 'in_progress' ? css.pill_in_progress : css.pill_open),
                      flexShrink: 0,
                    }}>
                      {r.status === 'in_progress' ? 'In Progress' : r.status === 'completed' ? 'Done' : 'Open'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 3 }}>
                    {r.type}{r.type && r.created_at ? ' · ' : ''}{fmtDate(r.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setTab('requests')}
            style={{ ...css.primaryBtn, width: '100%', marginTop: 14, padding: '9px', textAlign: 'center', fontSize: 13, cursor: 'pointer' }}
          >
            + Submit a Request
          </button>
        </div>

        {/* ── MEETING CTA — span 1 ── */}
        <div style={{
          background: 'var(--navy)',
          borderRadius: 10,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative background ring */}
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 160, height: 160, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.05)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: -10, right: -10,
            width: 100, height: 100, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.06)',
            pointerEvents: 'none',
          }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.38)', marginBottom: 14 }}>
              Let's connect
            </div>
            <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 24, color: '#fff', lineHeight: 1.25, marginBottom: 10 }}>
              Schedule time with your team.
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              Pick a time that works and we'll meet to discuss your project, answer questions, or share updates.
            </div>
          </div>
          <button
            onClick={() => setTab('calendar')}
            style={{
              ...css.primaryBtn,
              width: '100%',
              marginTop: 22,
              padding: '11px',
              textAlign: 'center',
              fontSize: 13,
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Request a Meeting →
          </button>
        </div>

        {/* ── RECENTLY DELIVERED ASSETS — full width ── */}
        <div style={{ ...css.card, gridColumn: 'span 4', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={css.cardTitle}>Recently Delivered</div>
            <span
              onClick={() => setTab('assets')}
              style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}
            >
              Browse all assets →
            </span>
          </div>
          {assets.length === 0 ? (
            <EmptyState icon="📦" text="No assets delivered yet — check back soon." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
              {assets.map(a => (
                <a
                  key={a.id}
                  href={a.drive_url || undefined}
                  target={a.drive_url ? '_blank' : undefined}
                  rel="noreferrer"
                  style={{
                    textDecoration: 'none',
                    background: 'var(--cream)',
                    borderRadius: 8,
                    padding: '16px 12px 14px',
                    textAlign: 'center',
                    cursor: a.drive_url ? 'pointer' : 'default',
                    transition: 'background 0.15s, transform 0.15s',
                    display: 'block',
                  }}
                  onMouseEnter={e => {
                    if (a.drive_url) {
                      e.currentTarget.style.background = 'var(--blue-light)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--cream)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{ fontSize: 30, marginBottom: 8, lineHeight: 1 }}>{fileIcon(a.file_type)}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--slate)', marginTop: 3 }}>{fmtDate(a.created_at)}</div>
                </a>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function EmptyState({ icon, text, green }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 16px', gap: 8, textAlign: 'center' }}>
      <div style={{ fontSize: 26, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 13, color: green ? 'var(--blue)' : 'var(--slate)', fontStyle: 'italic' }}>{text}</div>
    </div>
  );
}
