import { useState } from 'react';
import { GitBranch, Search, ChevronRight, Star } from 'lucide-react';
import PageHeader  from '../components/PageHeader';
import GraphCanvas from '../components/GraphCanvas';
import { toCytoscapeElements } from '../hooks/useGraphFetch';
import api from '../api/axios';

export default function TrustRoute() {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [topK,     setTopK]     = useState(5);
  const [result,   setResult]   = useState(null);
  const [elements, setElements] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [mode,     setMode]     = useState('path');

  const runTrustPath = async () => {
    if (!sourceId || !targetId) { setError('Both usernames required'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      // Send username — backend resolves to mongoId automatically
      const r = await api.get('/analytics/trust-path', {
        params: { sourceId: sourceId.trim(), targetId: targetId.trim() }
      });
      const { path = [], pathNames = [], nameMap = {}, ...rest } = r.data;
      setResult({ kind:'path', path, pathNames, nameMap, ...rest });
      const nodes = path.map((id, i) => ({ id, label: pathNames[i] || nameMap[id] || id }));
      const edges = path.slice(0,-1).map((_,i) => ({ src:path[i], dst:path[i+1], weight:0.85 }));
      setElements(toCytoscapeElements(nodes, edges, { highlightPath: path }));
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  const runRecommend = async () => {
    if (!sourceId) { setError('Source username required'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await api.get('/analytics/recommend', {
        params: { sourceId: sourceId.trim(), topK }
      });
      setResult({ kind:'recommend', recommendations: r.data });
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title="Trust Routing" subtitle="Find the highest-trust path between users. Enter usernames (e.g. arjun, priya)" badge="F8 · F13" />

      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem' }}>
        {[{id:'path',label:'Trust Path'},{id:'recommend',label:'Recommendations'}].map(m=>(
          <button key={m.id} onClick={()=>{setMode(m.id);setResult(null);setElements([]);setError('');}} className="btn"
            style={mode===m.id ? {background:'var(--gradient-accent)',color:'#fff',boxShadow:'0 2px 12px rgba(232,120,173,0.35)'} : {background:'var(--bg-surface)',color:'var(--text-secondary)',border:'1px solid var(--border-soft)'}}>
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:'1.5rem', alignItems:'start' }}>
        <div className="card fade-up" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

          <div>
            <label style={{ fontSize:'0.8rem', color:'var(--text-muted)', fontWeight:500, display:'block', marginBottom:'0.4rem' }}>
              Source Username
            </label>
            <input className="input" placeholder="e.g. arjun" value={sourceId}
              onChange={e=>setSourceId(e.target.value)} />
          </div>

          {mode === 'path' ? (
            <div>
              <label style={{ fontSize:'0.8rem', color:'var(--text-muted)', fontWeight:500, display:'block', marginBottom:'0.4rem' }}>
                Target Username
              </label>
              <input className="input" placeholder="e.g. zara" value={targetId}
                onChange={e=>setTargetId(e.target.value)} />
            </div>
          ) : (
            <div>
              <label style={{ fontSize:'0.8rem', color:'var(--text-muted)', fontWeight:500, display:'block', marginBottom:'0.4rem' }}>
                Top K: {topK}
              </label>
              <input type="range" min={1} max={10} value={topK}
                onChange={e=>setTopK(Number(e.target.value))}
                style={{ width:'100%', accentColor:'var(--accent-lavender)' }} />
            </div>
          )}

          <button className="btn btn-primary" onClick={mode==='path'?runTrustPath:runRecommend}
            disabled={loading} style={{ justifyContent:'center' }}>
            <Search size={14}/>{loading ? 'Computing…' : mode==='path' ? 'Find Path' : 'Get Recommendations'}
          </button>

          {/* Quick reference */}
          <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', background:'var(--blush-50)', padding:'0.6rem 0.8rem', borderRadius:'var(--radius-sm)', lineHeight:1.7 }}>
            <b style={{ color:'var(--text-secondary)' }}>Try these usernames:</b><br/>
            Tennis: arjun, priya, rohan, sneha, vivek, tanvi, nikhil, ishaan<br/>
            Cricket: rahul, kavya, ravi, meera, karan, pooja, aditya, sanya<br/>
            Science: ananya, siddharth, divya, kartik, nisha, pranav, ritika<br/>
            Movies: aarav, ishita, yash, roohi, kabir, zara, mihir
          </div>

          {error && (
            <div style={{ fontSize:'0.82rem', color:'#c04878', background:'rgba(232,120,173,0.1)', padding:'0.6rem 0.9rem', borderRadius:8 }}>
              {error}
            </div>
          )}

          {/* Path result */}
          {result?.kind === 'path' && (
            <div style={{ borderTop:'1px solid var(--border-soft)', paddingTop:'1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.75rem' }}>
                <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Trust Score</span>
                <span style={{ fontSize:'1rem', fontWeight:700, color: result.found ? 'var(--accent-lavender)' : '#c04878' }}>
                  {result.found ? `${(result.score*100).toFixed(1)}%` : 'No path found'}
                </span>
              </div>
              {result.found && (
                <>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'0.3rem', alignItems:'center' }}>
                    {(result.pathNames.length ? result.pathNames : result.path).map((name, i) => (
                      <span key={i} style={{ display:'flex', alignItems:'center', gap:'0.25rem' }}>
                        {i > 0 && <ChevronRight size={11} color="var(--text-faint)" />}
                        <span className="badge badge-pink" style={{ fontSize:'0.78rem' }}>{name}</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop:'0.75rem', padding:'0.6rem', background:'var(--lavender-50)', borderRadius:'var(--radius-sm)', fontSize:'0.78rem', color:'var(--text-secondary)' }}>
                    {result.pathNames.length} hops · Combined trust: {(result.score*100).toFixed(1)}%
                  </div>
                </>
              )}
            </div>
          )}

          {/* Recommendations */}
          {result?.kind === 'recommend' && (
            <div style={{ borderTop:'1px solid var(--border-soft)', paddingTop:'1rem' }}>
              <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'0.6rem', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                Top Recommendations
              </div>
              {(result.recommendations || []).map((rec, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.55rem 0.7rem', marginBottom:'0.4rem', borderRadius:'var(--radius-sm)', background: i===0?'rgba(166,127,247,0.1)':'var(--blush-50)', border:`1px solid ${i===0?'rgba(166,127,247,0.3)':'var(--border-soft)'}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background: i===0?'var(--gradient-accent)':'var(--mauve-100)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:700, color: i===0?'#fff':'var(--text-secondary)' }}>{i+1}</div>
                    <span style={{ fontSize:'0.88rem', fontWeight:500, color:'var(--text-secondary)' }}>
                      {rec.targetName || '—'}
                    </span>
                    {i===0 && <Star size={11} fill="#a67ff7" color="#a67ff7" />}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'0.78rem', color:'var(--accent-lavender)', fontWeight:600 }}>{(rec.score*100).toFixed(0)}%</div>
                    <div style={{ fontSize:'0.68rem', color:'var(--text-faint)' }}>
                      via {(rec.pathNames||[]).slice(1,-1).join(' → ') || 'direct'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding:'1rem' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', marginBottom:'1rem', paddingLeft:'0.4rem' }}>
            Path Visualization
          </div>
          {elements.length > 0
            ? <GraphCanvas elements={elements} highlightPath={result?.path||[]} />
            : (
              <div style={{ height:440, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,var(--blush-50),var(--lavender-50))', borderRadius:'var(--radius-lg)', border:'1px dashed var(--border-medium)', flexDirection:'column', gap:'0.75rem' }}>
                <GitBranch size={38} color="var(--text-faint)" />
                <span style={{ color:'var(--text-faint)', fontSize:'0.9rem' }}>Enter usernames and run to visualize</span>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
