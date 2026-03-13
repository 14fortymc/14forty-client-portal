import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';
import ProjectTimeline from './ProjectTimeline';
import ProjectOverview from './ProjectOverview';

export default function Projects({ clientId }) {
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProjects(); }, [clientId]);

  const fetchProjects = async () => {
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (projects) {
      setProjects(projects);
      for (const p of projects) {
        const { data: ms } = await supabase
          .from('milestones')
          .select('*')
          .eq('project_id', p.id)
          .order('sort_order', { ascending: true });
        setMilestones(prev => ({ ...prev, [p.id]: ms || [] }));
      }
    }
    setLoading(false);
  };

  if (loading) return <div style={css.loading}>Loading projects…</div>;
  if (projects.length === 0) return <div style={css.card}><div style={css.empty}>No active projects yet.</div></div>;

  return (
    <>
      <ProjectOverview projects={projects} milestones={milestones} />
      {projects.map(project => {
        const ms = milestones[project.id] || [];
        const doneCount = ms.filter(m => m.status === 'completed').length;
        const progressPct = ms.length > 0 ? Math.round((doneCount / ms.length) * 100) : 0;
        return (
          <div key={project.id} style={{...css.card, marginBottom: 20}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20}}>
              <div>
                <div style={{fontFamily:"'GaramondPro',Georgia,serif", fontSize:22}}>{project.name}</div>
                <div style={{fontSize:13, color:'var(--slate)', marginTop:3}}>{project.phase}</div>
              </div>
              <span style={{...css.pill, ...css.pill_due}}>In Progress</span>
            </div>

            {/* Progress bar — auto-calculated from completed milestones */}
            <div style={{marginBottom:28}}>
              <div style={{height:5, background:'var(--border)', borderRadius:3, overflow:'hidden'}}>
                <div style={{height:'100%', background:'var(--blue)', borderRadius:3, width:`${progressPct}%`, transition:'width 0.4s'}}></div>
              </div>
              {ms.length > 0 && (
                <div style={{fontSize:11, color:'var(--slate)', marginTop:6}}>{doneCount} of {ms.length} milestone{ms.length !== 1 ? 's' : ''} completed</div>
              )}
            </div>

            {/* Milestones — vertical step list */}
            {ms.map((m, i) => (
              <div key={m.id} style={{display:'flex', gap:16, alignItems:'flex-start', paddingBottom: i < ms.length-1 ? 20 : 0}}>
                <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                  <div style={{
                    width:20, height:20, borderRadius:'50%', flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:700,
                    background: m.status==='completed' ? 'var(--blue)' : m.status==='active' ? 'var(--orange-light)' : 'var(--white)',
                    border: m.status==='completed' ? '2px solid var(--blue)' : m.status==='active' ? '2px solid var(--orange)' : '2px solid var(--border)',
                    color: m.status==='completed' ? '#fff' : m.status==='active' ? 'var(--orange)' : 'transparent',
                  }}>{m.status==='completed' ? '✓' : ''}</div>
                  {i < ms.length-1 && (
                    <div style={{width:2, flex:1, background: m.status==='completed' ? 'var(--blue)' : 'var(--border)', marginTop:4, minHeight:20}}></div>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {m.phase_label && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--border)', color: 'var(--slate)', borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>{m.phase_label}</span>
                    )}
                    <span style={{
                      fontSize:14, fontWeight: m.status==='upcoming' ? 400 : 700,
                      color: m.status==='active' ? 'var(--orange)' : m.status==='upcoming' ? 'var(--slate)' : 'var(--navy)',
                    }}>{m.name}</span>
                  </div>
                  <div style={{fontSize:12, color:'var(--slate)', marginTop:2}}>
                    {m.target_date ? new Date(m.target_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}) : ''}
                  </div>
                </div>
              </div>
            ))}

            {/* Horizontal timeline — holistic date-based view */}
            <ProjectTimeline milestones={ms} />
          </div>
        );
      })}
    </>
  );
}
