import { css } from '../styles/shared';
import ProjectTimeline from './ProjectTimeline';

export default function ProjectOverview({ projects, milestones }) {
  if (projects.length < 2) return null;

  const phaseStatus = (ms) => {
    if (!ms.length) return 'upcoming';
    if (ms.every(m => m.status === 'completed')) return 'completed';
    if (ms.some(m => m.status === 'active')) return 'active';
    return 'upcoming';
  };

  const currentPhaseId = projects.find(p => phaseStatus(milestones[p.id] || []) !== 'completed')?.id;

  // "You are here" = first active milestone anywhere, or first upcoming in current phase
  const allFlat = projects.flatMap(p => milestones[p.id] || []);
  const hereMs =
    allFlat.find(m => m.status === 'active') ||
    (milestones[currentPhaseId] || []).find(m => m.status === 'upcoming');

  const totalMs = allFlat.length;

  const fmtDate = d =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const pillStyle = (status) => ({
    completed: { ...css.pill, ...css.pill_completed },
    active:    { ...css.pill, ...css.pill_in_progress },
    upcoming:  { ...css.pill, ...css.pill_pending },
  }[status] || { ...css.pill, ...css.pill_pending });

  const pillLabel = { completed: 'Completed', active: 'Active', upcoming: 'Upcoming' };

  const phaseColor = {
    completed: 'var(--blue)',
    active:    'var(--orange)',
    upcoming:  'var(--slate)',
  };

  return (
    <div style={{ ...css.card, marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'GaramondPro',Georgia,serif", fontSize: 22 }}>Full Roadmap</div>
          <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 4 }}>
            {projects.length} phases · {totalMs} milestone{totalMs !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Phase sections */}
      {projects.map((p, pi) => {
        const ms = milestones[p.id] || [];
        const status = phaseStatus(ms);
        const isCurrent = p.id === currentPhaseId;
        const phaseLabel = p.phase || p.name;

        return (
          <div key={p.id} style={{ marginBottom: pi < projects.length - 1 ? 32 : 0 }}>

            {/* Phase header divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{
                fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px',
                color: phaseColor[status], whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {phaseLabel}
              </span>
              <div style={{ flex: 1, height: 1, background: status === 'completed' ? 'var(--blue-light)' : 'var(--border)' }} />
              <span style={{ ...pillStyle(status), flexShrink: 0 }}>{pillLabel[status]}</span>
            </div>

            {/* Milestone step list */}
            {ms.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--slate)', fontStyle: 'italic', paddingLeft: 4, marginBottom: 4 }}>
                No milestones added yet.
              </div>
            ) : (
              <div style={{ paddingLeft: 4 }}>
                {ms.map((m, mi) => {
                  const isHere = m.id === hereMs?.id;
                  return (
                    <div key={m.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: mi < ms.length - 1 ? 16 : 0 }}>

                      {/* Dot + vertical connector */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 900,
                          background: m.status === 'completed' ? 'var(--blue)' : m.status === 'active' ? 'var(--orange)' : 'var(--white)',
                          border: m.status === 'completed' ? '2px solid var(--blue)' : m.status === 'active' ? '2px solid var(--orange)' : '2px solid var(--border)',
                          color: (m.status === 'completed' || m.status === 'active') ? '#fff' : 'transparent',
                          boxShadow: isHere ? '0 0 0 4px rgba(249,115,22,0.14)' : 'none',
                        }}>
                          {m.status === 'completed' ? '✓' : ''}
                        </div>
                        {mi < ms.length - 1 && (
                          <div style={{ width: 2, flex: 1, background: m.status === 'completed' ? 'var(--blue)' : 'var(--border)', marginTop: 3, minHeight: 16 }} />
                        )}
                      </div>

                      {/* Name + date + badge */}
                      <div style={{ paddingTop: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 14,
                            fontWeight: m.status === 'upcoming' ? 400 : 600,
                            color: m.status === 'active' ? 'var(--orange)' : m.status === 'upcoming' ? 'var(--slate)' : 'var(--navy)',
                          }}>
                            {m.name}
                          </span>
                          {isHere && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, color: 'var(--orange)',
                              background: 'var(--orange-light)', borderRadius: 4, padding: '2px 7px',
                            }}>
                              You are here
                            </span>
                          )}
                        </div>
                        {m.target_date && (
                          <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>{fmtDate(m.target_date)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Combined timeline across all phases */}
      {allFlat.length > 0 && <ProjectTimeline milestones={allFlat} />}
    </div>
  );
}
