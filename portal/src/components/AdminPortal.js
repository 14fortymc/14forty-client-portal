import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AdminClients from './AdminClients';
import AdminClientDetail from './AdminClientDetail';

const NAV = [
  { key: 'clients', label: 'Clients' },
  { key: 'requests', label: 'Work Requests' },
  { key: 'meetings', label: 'Meeting Requests' },
];

export default function AdminPortal({ onSignOut, accessToken }) {
  const [tab, setTab] = useState('clients');
  const [selectedClient, setSelectedClient] = useState(null);
  const [counts, setCounts] = useState({ requests: 0, meetings: 0 });

  useEffect(() => { fetchCounts(); }, []);

  const fetchCounts = async () => {
    const [{ count: rc }, { count: mc }] = await Promise.all([
      supabase.from('work_requests').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('meeting_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    setCounts({ requests: rc || 0, meetings: mc || 0 });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 248, minWidth: 248, background: 'var(--navy)', padding: '32px 0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '0 24px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 28 }}>
          <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 26, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            14Forty <div style={{ width: 7, height: 7, background: 'var(--orange)', borderRadius: '50%' }}></div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '1.2px', marginTop: 6, fontWeight: 700 }}>Admin Portal</div>
        </div>

        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {NAV.map(n => (
            <div key={n.key}
              onClick={() => { setTab(n.key); setSelectedClient(null); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 6, fontSize: 14, cursor: 'pointer',
                marginBottom: 2, transition: 'all 0.14s',
                background: tab === n.key && !selectedClient ? 'var(--blue)' : 'transparent',
                color: tab === n.key && !selectedClient ? '#fff' : 'rgba(255,255,255,0.5)',
                fontWeight: tab === n.key && !selectedClient ? 700 : 400,
              }}>
              {n.label}
              {n.key === 'requests' && counts.requests > 0 && (
                <span style={{ background: 'var(--orange)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 100, padding: '1px 7px' }}>{counts.requests}</span>
              )}
              {n.key === 'meetings' && counts.meetings > 0 && (
                <span style={{ background: 'var(--orange)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 100, padding: '1px 7px' }}>{counts.meetings}</span>
              )}
            </div>
          ))}
        </nav>

        <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div onClick={onSignOut} style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>Sign out</div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--cream)' }}>
        <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {selectedClient && (
              <span onClick={() => setSelectedClient(null)} style={{ fontSize: 13, color: 'var(--blue)', cursor: 'pointer', fontWeight: 700 }}>← All Clients</span>
            )}
            <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 26, color: 'var(--navy)' }}>
              {selectedClient ? selectedClient.company_name || selectedClient.name : tab === 'clients' ? 'Clients' : tab === 'requests' ? 'Work Requests' : 'Meeting Requests'}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--slate)', background: 'var(--cream)', padding: '4px 12px', borderRadius: 100, border: '1px solid var(--border)' }}>Admin</div>
        </div>

        <div style={{ padding: '36px 40px', maxWidth: tab === 'requests' && !selectedClient ? 'none' : 1020 }}>
          {selectedClient ? (
            <AdminClientDetail client={selectedClient} onBack={() => setSelectedClient(null)} accessToken={accessToken} onClientUpdate={(updated) => setSelectedClient(prev => ({ ...prev, ...updated }))} />
          ) : tab === 'clients' ? (
            <AdminClients onSelectClient={setSelectedClient} accessToken={accessToken} />
          ) : tab === 'requests' ? (
            <AdminWorkRequests />
          ) : (
            <AdminMeetingRequests />
          )}
        </div>
      </div>
    </div>
  );
}

const KANBAN_COLUMNS = [
  { key: 'open',        label: 'Open',        color: 'var(--orange)', bg: 'var(--orange-light)' },
  { key: 'on_hold',     label: 'On Hold',     color: '#64748b',       bg: '#eef0f2' },
  { key: 'in_progress', label: 'In Progress', color: '#7c5cbf',       bg: '#f3f0fb' },
  { key: 'completed',   label: 'Completed',   color: '#16a34a',       bg: '#dcfce7' },
  { key: 'rejected',    label: 'Rejected',    color: '#dc2626',       bg: '#fee2e2' },
];

function AdminWorkRequests() {
  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data: reqs } = await supabase.from('work_requests').select('*').order('created_at', { ascending: false });
    const { data: cls } = await supabase.from('clients').select('id, name, company_name');
    const clientMap = {};
    (cls || []).forEach(c => clientMap[c.id] = c.company_name || c.name);
    setRequests(reqs || []);
    setClients(clientMap);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    await supabase.from('work_requests').update({ status }).eq('id', id);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  if (loading) return <div style={{ fontSize: 14, color: 'var(--slate)' }}>Loading…</div>;

  if (requests.length === 0) return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, fontSize: 14, color: 'var(--slate)', textAlign: 'center' }}>No work requests yet.</div>
  );

  return (
    <div style={{ overflowX: 'auto', margin: '0 -40px', padding: '0 40px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 860, paddingBottom: 24 }}>
        {KANBAN_COLUMNS.map(col => {
          const cards = requests.filter(r => (r.status || 'open') === col.key);
          return (
            <div key={col.key} style={{ flex: '1 0 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Column header */}
              <div style={{ background: col.bg, borderRadius: 8, padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{col.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: col.color, background: 'rgba(255,255,255,0.65)', borderRadius: 100, padding: '1px 7px', minWidth: 20, textAlign: 'center' }}>{cards.length}</span>
              </div>

              {/* Empty column */}
              {cards.length === 0 && (
                <div style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: '20px 12px', fontSize: 12, color: 'var(--slate)', textAlign: 'center', opacity: 0.6 }}>Empty</div>
              )}

              {/* Cards */}
              {cards.map(r => (
                <div key={r.id} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 13px', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 700 }}>{clients[r.client_id] || 'Unknown'}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{r.subject}</div>
                  {r.type && <div style={{ fontSize: 11, color: 'var(--slate)' }}>{r.type}</div>}
                  <div style={{ fontSize: 11, color: 'var(--slate)' }}>{fmtDate(r.created_at)}</div>
                  {r.detail && <div style={{ fontSize: 11, color: 'var(--slate)', lineHeight: 1.4, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>{r.detail.length > 80 ? r.detail.slice(0, 80) + '…' : r.detail}</div>}
                  <select
                    value={r.status || 'open'}
                    onChange={e => updateStatus(r.id, e.target.value)}
                    style={{ marginTop: 2, width: '100%', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 7px', fontSize: 11, fontFamily: 'inherit', background: 'var(--cream)', cursor: 'pointer' }}>
                    <option value="open">Open</option>
                    <option value="on_hold">On Hold</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              ))}

            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminMeetingRequests() {
  const [meetings, setMeetings] = useState([]);
  const [clients, setClients] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data: mtgs } = await supabase.from('meeting_requests').select('*').order('created_at', { ascending: false });
    const { data: cls } = await supabase.from('clients').select('id, name, company_name');
    const clientMap = {};
    (cls || []).forEach(c => clientMap[c.id] = c.company_name || c.name);
    setMeetings(mtgs || []);
    setClients(clientMap);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    await supabase.from('meeting_requests').update({ status }).eq('id', id);
    fetchAll();
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  if (loading) return <div style={{ fontSize: 14, color: 'var(--slate)' }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {meetings.length === 0 && <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, fontSize: 14, color: 'var(--slate)', textAlign: 'center' }}>No meeting requests yet.</div>}
      {meetings.map(m => (
        <div key={m.id} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 700, marginBottom: 4 }}>{clients[m.client_id] || 'Unknown Client'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Requested {fmtDate(m.created_at)}</div>
              <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 4, fontWeight: 700 }}>Proposed times:</div>
              {(m.proposed_times || []).map((t, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 2 }}>· {t}</div>
              ))}
              {m.notes && <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 8, fontStyle: 'italic' }}>{m.notes}</div>}
            </div>
            <select
              value={m.status}
              onChange={e => updateStatus(m.id, e.target.value)}
              style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--cream)', cursor: 'pointer' }}>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
