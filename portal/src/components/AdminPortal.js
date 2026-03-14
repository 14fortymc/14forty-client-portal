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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { fetchCounts(); }, []);

  const fetchCounts = async () => {
    const [{ count: rc }, { count: mc }] = await Promise.all([
      supabase.from('work_requests').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('meeting_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    setCounts({ requests: rc || 0, meetings: mc || 0 });
  };

  return (
    <>
      {/* Mobile/tablet backdrop */}
      <div className={`rsp-overlay${sidebarOpen ? ' is-open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside className={`rsp-sidebar${sidebarOpen ? ' is-open' : ''}`}>
          <div style={{ padding: '0 24px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 28 }}>
            <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 26, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              14Forty <div style={{ width: 7, height: 7, background: 'var(--orange)', borderRadius: '50%' }}></div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '1.2px', marginTop: 6, fontWeight: 700 }}>Admin Portal</div>
          </div>

          <nav style={{ padding: '16px 12px', flex: 1 }}>
            {NAV.map(n => (
              <div key={n.key}
                onClick={() => { setTab(n.key); setSelectedClient(null); setSidebarOpen(false); }}
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
            <div onClick={() => { onSignOut(); setSidebarOpen(false); }} style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>Sign out</div>
          </div>
        </aside>

        {/* Main */}
        <div className="rsp-main" style={{ background: 'var(--cream)' }}>
          <div className="rsp-topbar">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="rsp-hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Open menu">
                <span /><span /><span />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedClient && (
                  <span onClick={() => { setSelectedClient(null); setSidebarOpen(false); }} style={{ fontSize: 13, color: 'var(--blue)', cursor: 'pointer', fontWeight: 700 }}>← All Clients</span>
                )}
                <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 26, color: 'var(--navy)' }}>
                  {selectedClient ? selectedClient.company_name || selectedClient.name : tab === 'clients' ? 'Clients' : tab === 'requests' ? 'Work Requests' : 'Meeting Requests'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate)', background: 'var(--cream)', padding: '4px 12px', borderRadius: 100, border: '1px solid var(--border)', flexShrink: 0 }}>Admin</div>
          </div>

          <div className="rsp-page">
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
    </>
  );
}

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
    await supabase.from('work_requests').update({ status }).eq('id', id);
    fetchAll();
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  if (loading) return <div style={{ fontSize: 14, color: 'var(--slate)' }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {requests.length === 0 && <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, fontSize: 14, color: 'var(--slate)', textAlign: 'center' }}>No work requests yet.</div>}
      {requests.map(r => (
        <div key={r.id} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 700, marginBottom: 4 }}>{clients[r.client_id] || 'Unknown Client'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{r.subject}</div>
              <div style={{ fontSize: 13, color: 'var(--slate)' }}>{r.type} · {fmtDate(r.created_at)}</div>
              {r.detail && <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 8, lineHeight: 1.5 }}>{r.detail}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <select
                value={r.status}
                onChange={e => updateStatus(r.id, e.target.value)}
                style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--cream)', cursor: 'pointer' }}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      ))}
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
