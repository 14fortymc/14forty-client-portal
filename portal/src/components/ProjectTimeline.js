export default function ProjectTimeline({ milestones }) {
  const dated = milestones
    .filter(m => m.target_date)
    .sort((a, b) => new Date(a.target_date) - new Date(b.target_date));

  if (dated.length === 0) return null;

  const DAY = 86400000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dMs = dated.map(m => +new Date(m.target_date));
  const minD = Math.min(...dMs);
  const maxD = Math.max(...dMs);
  const rawSpan = maxD - minD || 30 * DAY;
  const pad = rawSpan * 0.15;
  const start = minD - pad;
  const end = maxD + pad;
  const span = end - start;

  const toPct = d => ((+new Date(d) - start) / span) * 100;
  const todayPct = toPct(today);
  const showToday = todayPct > 1 && todayPct < 99;

  // Layout constants (px)
  const H = 160, LINE = 78, TICK = 14, DOT = 7;

  const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dotBorder = { completed: 'var(--blue)', active: 'var(--orange)', upcoming: 'var(--border)' };
  const dotFill   = { completed: 'var(--blue)', active: 'var(--orange)', upcoming: 'var(--white)' };
  const textColor = { completed: 'var(--navy)', active: 'var(--orange)', upcoming: 'var(--slate)' };

  // last completed/active milestone for progress fill
  const done = dated.filter(m => m.status !== 'upcoming');
  const fillPct = done.length ? toPct(done[done.length - 1].target_date) : 0;

  return (
    <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--slate)', marginBottom: 24 }}>
        Timeline
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ position: 'relative', height: H, userSelect: 'none', minWidth: 480 }}>

        {/* Base track */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: LINE, height: 2, background: 'var(--border)', borderRadius: 1 }} />

        {/* Progress fill */}
        {done.length > 0 && (
          <div style={{ position: 'absolute', left: 0, top: LINE, height: 2, width: `${fillPct}%`, background: 'var(--blue)', borderRadius: 1, transition: 'width 0.4s' }} />
        )}

        {/* Today marker */}
        {showToday && (
          <div style={{ position: 'absolute', left: `${todayPct}%`, top: LINE - 36, transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 3 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--orange)', textAlign: 'center', letterSpacing: '0.6px', whiteSpace: 'nowrap', marginBottom: 4 }}>TODAY</div>
            <div style={{ width: 1, height: 44, background: 'var(--orange)', margin: '0 auto', opacity: 0.45 }} />
          </div>
        )}

        {/* Milestone nodes — alternate labels above/below to reduce crowding */}
        {dated.map((m, i) => {
          const x = toPct(m.target_date);
          const above = i % 2 === 1;
          return (
            <div key={m.id} style={{ position: 'absolute', left: `${x}%`, top: 0, height: '100%', transform: 'translateX(-50%)', width: 96, zIndex: 2 }}>

              {/* Dot */}
              <div style={{
                position: 'absolute', top: LINE, left: '50%', transform: 'translate(-50%, -50%)',
                width: DOT * 2, height: DOT * 2, borderRadius: '50%', zIndex: 4,
                background: dotFill[m.status] || 'var(--white)',
                border: `2.5px solid ${dotBorder[m.status] || 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 900, color: '#fff',
                boxShadow: m.status === 'active' ? '0 0 0 4px rgba(249,115,22,0.15)' : 'none',
              }}>
                {m.status === 'completed' ? '✓' : ''}
              </div>

              {/* Connector tick */}
              <div style={{
                position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                width: 1, background: 'var(--border)', height: TICK,
                top: above ? LINE - DOT - TICK : LINE + DOT,
              }} />

              {/* Label — below line for even indices, above for odd */}
              <div style={{
                position: 'absolute', left: 0, right: 0, textAlign: 'center',
                ...(above
                  ? { bottom: H - (LINE - DOT - TICK) }  // label bottom anchored just above the tick
                  : { top: LINE + DOT + TICK }),           // label top anchored just below the tick
              }}>
                <div style={{ fontSize: 11, fontWeight: m.status === 'upcoming' ? 400 : 600, color: textColor[m.status] || 'var(--slate)', lineHeight: 1.35 }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--slate)', marginTop: 2 }}>
                  {fmtDate(m.target_date)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
