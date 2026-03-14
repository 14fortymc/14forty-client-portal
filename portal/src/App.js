import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Invoices from './components/Invoices';
import Projects from './components/Projects';
import Requests from './components/Requests';
import Assets from './components/Assets';
import Billing from './components/Billing';
import Calendar from './components/Calendar';
import AdminPortal from './components/AdminPortal';
import Home from './components/Home';
import ChangePassword from './components/ChangePassword';
import ResetPassword from './components/ResetPassword';

const NAV = [
  { key: 'home', label: 'Home' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'projects', label: 'Project Status' },
  { key: 'requests', label: 'Requests' },
  { key: 'assets', label: 'Delivered Assets' },
  { key: 'billing', label: 'Billing Info' },
  { key: 'calendar', label: 'Request a Meeting' },
];

const PAGE_TITLES = {
  home: 'Home',
  invoices: 'Invoices',
  projects: 'Project Status',
  requests: 'Requests',
  assets: 'Delivered Assets',
  billing: 'Billing Info',
  calendar: 'Request a Meeting',
};

export default function App() {
  const [session, setSession] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [clientName, setClientName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(true);
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState('home');
  const [pendingTasks, setPendingTasks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [passwordReset, setPasswordReset] = useState(false);

  useEffect(() => {
    // Detect recovery links before getSession() processes them — prevents the portal
    // from flashing visible while we wait for the PASSWORD_RECOVERY event.
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    const isRecoveryUrl =
      hash.includes('type=recovery') ||
      searchParams.get('type') === 'recovery';

    if (isRecoveryUrl) {
      setPasswordReset(true);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isRecoveryUrl) return; // wait for PASSWORD_RECOVERY event
      setSession(session);
      if (session) loadClient(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordReset(true);
        setLoading(false);
        return;
      }
      setPasswordReset(false);
      setSession(session);
      if (session) loadClient(session.user.id);
      else { setClientId(null); setClientName(''); setIsAdmin(false); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadClient = async (uid) => {
    const { data: cu } = await supabase
      .from('client_users')
      .select('client_id, is_admin, password_changed, clients(name, company_name)')
      .eq('user_id', uid)
      .single();

    if (cu) {
      setUserId(uid);
      setClientId(cu.client_id);
      setIsAdmin(cu.is_admin || false);
      setPasswordChanged(cu.password_changed ?? true);
      setClientName(cu.clients?.company_name || cu.clients?.name || '');
      if (!cu.is_admin) loadPendingTasks(cu.client_id);
    }
    setLoading(false);
  };

  const loadPendingTasks = async (cid) => {
    const { count } = await supabase
      .from('feedback_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', cid)
      .eq('status', 'awaiting');
    setPendingTasks(count || 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', fontFamily: 'inherit', color: 'var(--slate)', fontSize: 14 }}>
      Loading…
    </div>
  );

  if (passwordReset) return <ResetPassword />;

  if (!session) return <Login />;

  // Force password change on first login (non-admin clients only)
  if (!isAdmin && !passwordChanged) return <ChangePassword userId={userId} />;

  // Admin view
  if (isAdmin) return <AdminPortal onSignOut={handleSignOut} accessToken={session?.access_token} />;

  if (!clientId) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', fontFamily: 'inherit' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 22, marginBottom: 8 }}>Account not found</div>
        <div style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 20 }}>Your user isn't linked to a client account yet. Contact 14Forty to get set up.</div>
        <button onClick={handleSignOut} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Sign Out</button>
      </div>
    </div>
  );

  const initials = clientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 248, minWidth: 248, background: 'var(--navy)', padding: '32px 0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '0 24px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: "'GaramondPro',Georgia,serif", fontSize: 26, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          14Forty
          <div style={{ width: 7, height: 7, background: 'var(--orange)', borderRadius: '50%' }}></div>
        </div>

        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Your Account
          <strong style={{ display: 'block', fontSize: 14, color: 'rgba(255,255,255,0.88)', textTransform: 'none', letterSpacing: 0, marginTop: 3, fontWeight: 400 }}>{clientName}</strong>
        </div>

        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {NAV.map(n => (
            <div key={n.key}
              onClick={() => setTab(n.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6,
                fontSize: 14, cursor: 'pointer', marginBottom: 2, transition: 'all 0.14s',
                background: tab === n.key ? 'var(--blue)' : 'transparent',
                color: tab === n.key ? '#fff' : 'rgba(255,255,255,0.5)',
                fontWeight: tab === n.key ? 700 : 400,
              }}>
              {n.label}
              {n.key === 'requests' && pendingTasks > 0 && (
                <span style={{ marginLeft: 'auto', background: 'var(--orange)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 100, padding: '1px 7px' }}>
                  {pendingTasks}
                </span>
              )}
            </div>
          ))}
        </nav>

        <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div onClick={handleSignOut} style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>Sign out</div>
        </div>
      </aside>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 26, color: 'var(--navy)' }}>{PAGE_TITLES[tab]}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {tab === 'invoices' && <span style={{ background: 'var(--orange)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 100, padding: '2px 9px' }}>Check Balance</span>}
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{initials}</div>
          </div>
        </div>

        <div style={{ padding: '36px 40px', maxWidth: 1020 }}>
          {tab === 'home' && <Home clientId={clientId} clientName={clientName} setTab={setTab} />}
          {tab === 'invoices' && <Invoices clientId={clientId} />}
          {tab === 'projects' && <Projects clientId={clientId} />}
          {tab === 'requests' && <Requests clientId={clientId} />}
          {tab === 'assets' && <Assets clientId={clientId} />}
          {tab === 'billing' && <Billing clientId={clientId} />}
          {tab === 'calendar' && <Calendar clientId={clientId} />}
        </div>
      </div>
    </div>
  );
}
