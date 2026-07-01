import { useEffect, useState } from 'react';
import { Users, AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import PageHeader  from '../components/PageHeader';
import GraphCanvas from '../components/GraphCanvas';
import MetricCard  from '../components/MetricCard';
import { toCytoscapeElements } from '../hooks/useGraphFetch';
import api from '../api/axios';

const HUES = [320, 265, 290, 340, 280, 310, 255, 300, 270, 330];

export default function Communities() {
  const [communities,  setCommunities]  = useState(null);
  const [echoChambers, setEchoChambers] = useState([]);
  const [stability,    setStability]    = useState(null);
  const [conflicts,    setConflicts]    = useState([]);
  const [elements,     setElements]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('communities');

  const load = async () => {
    setLoading(true);
    try {
      const [commRes, echoRes, stabRes, confRes] = await Promise.all([
        api.get('/analytics/communities'),
        api.get('/analytics/echo-chambers'),
        api.get('/analytics/stability'),
        api.get('/analytics/conflicts'),
      ]);
      setCommunities(commRes.data);
      setEchoChambers(echoRes.data || []);
      setStability(stabRes.data);
      setConflicts(confRes.data || []);

      // Build graph using username labels from backend
      const members = commRes.data.members || [];
      const nodes   = members.map(m => ({ id: m.id, label: m.username || m.id }));
      const commMap = Object.fromEntries(members.map(m => [m.id, m.communityId]));
      setElements(toCytoscapeElements(nodes, [], { communityColors: commMap }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const flagged = echoChambers.filter(e => e.flagged);

  const tabs = [
    { id:'communities', label:'Clusters' },
    { id:'echo',        label:'Echo Chambers' },
    { id:'conflicts',   label:'Conflict Zones' },
  ];

  return (
    <div>
      <PageHeader title="Communities & Stability" subtitle="Louvain-detected clusters, echo chamber isolation scores, and structural conflict triads" badge="F1 · F3 · F9 · F12" />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(165px,1fr))', gap:'1rem', marginBottom:'2rem' }}>
        <MetricCard title="Communities"    value={loading?'…':(communities?.numCommunities??0)} icon={Users}         accent="pink" />
        <MetricCard title="Echo Chambers"  value={loading?'…':flagged.length}                  icon={AlertTriangle} accent="lavender" />
        <MetricCard title="Stability"      value={stability?`${(stability.globalScore*100).toFixed(0)}%`:'…'} icon={Shield} accent="mauve" />
        <MetricCard title="Conflict Triads"value={loading?'…':conflicts.length}                icon={AlertTriangle} accent="rose" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'1.5rem', alignItems:'start' }}>
        <div className="card" style={{ padding:'1rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', paddingLeft:'0.4rem' }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'1.15rem' }}>Community Map</span>
            <button className="btn btn-ghost" onClick={load} style={{ padding:'0.35rem 0.8rem', fontSize:'0.78rem', gap:'0.4rem' }}>
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          {loading
            ? <div className="skeleton" style={{ height:440 }} />
            : <GraphCanvas elements={elements} />
          }
        </div>

        <div className="card fade-up" style={{ padding:'0' }}>
          <div style={{ display:'flex', borderBottom:'1px solid var(--border-soft)' }}>
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:'0.75rem 0.5rem', background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem', fontWeight:500, color: tab===t.id ? 'var(--accent-lavender)' : 'var(--text-muted)', borderBottom: tab===t.id ? '2px solid var(--accent-lavender)' : '2px solid transparent', transition:'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding:'1rem' }}>

            {/* Clusters tab — shows community sizes */}
            {tab==='communities' && (
              loading
                ? [1,2,3,4].map(i=><div key={i} className="skeleton" style={{ height:40, marginBottom:8 }}/>)
                : (communities?.densities||[]).length === 0
                  ? <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.85rem' }}>No communities detected yet</div>
                  : (communities.densities||[]).map((density, i) => {
                      const hue  = HUES[i % HUES.length];
                      const size = (communities.members||[]).filter(m => m.communityId === i).length;
                      // Show member usernames in this community
                      const memberNames = (communities.members||[])
                        .filter(m => m.communityId === i)
                        .map(m => m.username || m.id)
                        .slice(0, 5);
                      return (
                        <div key={i} style={{ padding:'0.65rem 0.8rem', marginBottom:'0.5rem', borderRadius:'var(--radius-sm)', background:`hsl(${hue},60%,96%)`, border:`1px solid hsl(${hue},40%,88%)` }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.35rem' }}>
                            <span style={{ fontSize:'0.83rem', fontWeight:600, color:`hsl(${hue},50%,33%)` }}>
                              Community {i}
                            </span>
                            <span className="badge" style={{ background:`hsl(${hue},50%,88%)`, color:`hsl(${hue},50%,35%)`, fontSize:'0.68rem' }}>
                              {size} members
                            </span>
                          </div>
                          {/* Member name chips */}
                          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.25rem', marginBottom:'0.35rem' }}>
                            {memberNames.map(name => (
                              <span key={name} style={{ fontSize:'0.68rem', padding:'1px 7px', borderRadius:'99px', background:`hsl(${hue},45%,90%)`, color:`hsl(${hue},45%,38%)`, fontWeight:500 }}>
                                {name}
                              </span>
                            ))}
                            {size > 5 && <span style={{ fontSize:'0.68rem', color:`hsl(${hue},40%,55%)` }}>+{size-5} more</span>}
                          </div>
                          <div style={{ height:4, background:`hsl(${hue},30%,88%)`, borderRadius:99 }}>
                            <div style={{ height:'100%', width:`${(density*100).toFixed(0)}%`, borderRadius:99, background:`hsl(${hue},55%,65%)` }}/>
                          </div>
                          <div style={{ fontSize:'0.7rem', color:`hsl(${hue},40%,55%)`, marginTop:'0.25rem' }}>
                            {(density*100).toFixed(0)}% internal density
                          </div>
                        </div>
                      );
                    })
            )}

            {/* Echo chambers tab */}
            {tab==='echo' && (
              loading
                ? [1,2,3].map(i=><div key={i} className="skeleton" style={{ height:56, marginBottom:8 }}/>)
                : echoChambers.length===0
                  ? <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.85rem' }}>No data</div>
                  : echoChambers.map(ec => (
                    <div key={ec.communityId} style={{ padding:'0.7rem', marginBottom:'0.5rem', borderRadius:'var(--radius-sm)', background: ec.flagged ? 'rgba(232,120,173,0.07)' : 'var(--lavender-50)', border:`1px solid ${ec.flagged?'rgba(232,120,173,0.25)':'var(--border-soft)'}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.35rem' }}>
                        <span style={{ fontSize:'0.83rem', fontWeight:600, color:'var(--text-secondary)' }}>
                          Community {ec.communityId}
                        </span>
                        <span className={`badge ${ec.flagged?'badge-pink':'badge-lavender'}`}>
                          {ec.flagged ? '⚠ Isolated' : '✓ Open'}
                        </span>
                      </div>
                      {/* Show member names for this community */}
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.25rem', marginBottom:'0.4rem' }}>
                        {(communities?.members||[]).filter(m=>m.communityId===ec.communityId).slice(0,6).map(m=>(
                          <span key={m.id} style={{ fontSize:'0.68rem', padding:'1px 7px', borderRadius:'99px', background: ec.flagged?'rgba(232,120,173,0.12)':'var(--lavender-100)', color: ec.flagged?'#c04878':'var(--lavender-500)', fontWeight:500 }}>
                            {m.username || m.id}
                          </span>
                        ))}
                      </div>
                      <div style={{ display:'flex', gap:'1rem', fontSize:'0.73rem', color:'var(--text-muted)' }}>
                        <span>Internal: <b style={{ color:'var(--text-secondary)' }}>{(ec.internalDensity*100).toFixed(0)}%</b></span>
                        <span>External: <b style={{ color:'var(--text-secondary)' }}>{(ec.externalRatio*100).toFixed(0)}%</b></span>
                      </div>
                    </div>
                  ))
            )}

            {/* Conflicts tab — shows usernames in triads */}
            {tab==='conflicts' && (
              <>
                {stability && (
                  <div style={{ padding:'0.7rem', marginBottom:'0.75rem', borderRadius:'var(--radius-sm)', background:'var(--lavender-50)', border:'1px solid var(--border-soft)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Global Stability</span>
                      <span style={{ fontSize:'0.9rem', fontWeight:700, color:'var(--accent-lavender)' }}>{(stability.globalScore*100).toFixed(0)}%</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'0.3rem' }}>
                      <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Clustering Coeff</span>
                      <span style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--text-secondary)' }}>{stability.clusteringCoeff?.toFixed(3)}</span>
                    </div>
                  </div>
                )}
                {loading
                  ? [1,2].map(i=><div key={i} className="skeleton" style={{ height:52, marginBottom:8 }}/>)
                  : conflicts.length===0
                    ? <div style={{ textAlign:'center', padding:'1.5rem', color:'var(--text-muted)', fontSize:'0.85rem' }}>✓ No conflict triads detected</div>
                    : conflicts.slice(0,8).map((t,i)=>(
                      <div key={i} style={{ padding:'0.6rem 0.8rem', marginBottom:'0.4rem', borderRadius:'var(--radius-sm)', background:'rgba(232,120,173,0.07)', border:'1px solid rgba(232,120,173,0.2)' }}>
                        <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:'0.3rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                          Conflict Triad {i+1}
                        </div>
                        {/* Show usernames — aName/bName/cName from backend */}
                        <div style={{ display:'flex', gap:'0.35rem', flexWrap:'wrap', alignItems:'center' }}>
                          <span className="badge badge-pink">{t.aName || t.a}</span>
                          <span style={{ fontSize:'0.7rem', color:'var(--text-faint)' }}>↔</span>
                          <span className="badge badge-pink">{t.bName || t.b}</span>
                          <span style={{ fontSize:'0.7rem', color:'var(--text-faint)' }}>↔</span>
                          <span className="badge badge-pink">{t.cName || t.c}</span>
                        </div>
                      </div>
                    ))
                }
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
