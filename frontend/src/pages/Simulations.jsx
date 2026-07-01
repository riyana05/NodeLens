import { useState } from 'react';
import { Zap, Trash2, BarChart2, Play } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import PageHeader from '../components/PageHeader';
import api from '../api/axios';

const USERNAME_HINT = (
  <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', background:'var(--blush-50)', padding:'0.6rem 0.8rem', borderRadius:'var(--radius-sm)', lineHeight:1.7 }}>
    <b style={{ color:'var(--text-secondary)' }}>Try these usernames:</b><br/>
    High spread: ananya, arjun, ravi (bridge nodes)<br/>
    Low spread: ishaan, pranav, mihir (leaf nodes)
  </div>
);

export default function Simulations() {
  const [mode,      setMode]      = useState('spread');
  const [seedId,    setSeedId]    = useState('');
  const [removeId,  setRemoveId]  = useState('');
  const [maxRounds, setMaxRounds] = useState(20);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      if (mode === 'spread') {
        if (!seedId) { setError('Enter a username'); setLoading(false); return; }
        // Send username — backend resolves to mongoId
        const r = await api.get('/analytics/simulate-spread', {
          params: { seedId: seedId.trim(), maxRounds }
        });
        setResult({ type:'spread', ...r.data });
      } else {
        if (!removeId) { setError('Enter a username'); setLoading(false); return; }
        const r = await api.get('/analytics/simulate-removal', {
          params: { removeId: removeId.trim() }
        });
        setResult({ type:'removal', ...r.data });
      }
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  const areaData = (() => {
    if (result?.type !== 'spread') return [];
    let cum = 1;
    return (result.steps||[]).map(s => {
      const n = s.newlyInfectedNames?.length || s.newlyInfected?.length || 0;
      cum += n;
      return { round:`R${s.round}`, new: n, total: cum };
    });
  })();

  return (
    <div>
      <PageHeader title="Simulations" subtitle="Viral spread and node removal — enter a username to simulate" badge="F5 · F10" />

      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem' }}>
        {[{id:'spread',label:'Viral Spread',icon:Zap},{id:'removal',label:'Node Removal',icon:Trash2}].map(({id,label,icon:Icon})=>(
          <button key={id} onClick={()=>{setMode(id);setResult(null);setError('');}} className="btn"
            style={mode===id ? {background:'var(--gradient-accent)',color:'#fff',boxShadow:'0 2px 12px rgba(232,120,173,0.35)'} : {background:'var(--bg-surface)',color:'var(--text-secondary)',border:'1px solid var(--border-soft)'}}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:'1.5rem', alignItems:'start' }}>
        <div className="card fade-up" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

          {mode === 'spread' ? (
            <>
              <div>
                <label style={{ fontSize:'0.8rem', color:'var(--text-muted)', fontWeight:500, display:'block', marginBottom:'0.4rem' }}>
                  Seed Username
                </label>
                <input className="input" placeholder="e.g. ananya" value={seedId}
                  onChange={e=>setSeedId(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize:'0.8rem', color:'var(--text-muted)', fontWeight:500, display:'block', marginBottom:'0.4rem' }}>
                  Max Rounds: <strong style={{ color:'var(--accent-lavender)' }}>{maxRounds}</strong>
                </label>
                <input type="range" min={3} max={50} value={maxRounds}
                  onChange={e=>setMaxRounds(Number(e.target.value))}
                  style={{ width:'100%', accentColor:'var(--accent-lavender)' }} />
              </div>
            </>
          ) : (
            <div>
              <label style={{ fontSize:'0.8rem', color:'var(--text-muted)', fontWeight:500, display:'block', marginBottom:'0.4rem' }}>
                Username to Remove
              </label>
              <input className="input" placeholder="e.g. arjun" value={removeId}
                onChange={e=>setRemoveId(e.target.value)} />
            </div>
          )}

          {USERNAME_HINT}

          <button className="btn btn-primary" onClick={run} disabled={loading} style={{ justifyContent:'center' }}>
            <Play size={14}/>{loading ? 'Running…' : 'Run Simulation'}
          </button>

          {error && (
            <div style={{ fontSize:'0.82rem', color:'#c04878', background:'rgba(232,120,173,0.1)', padding:'0.6rem 0.9rem', borderRadius:8 }}>
              {error}
            </div>
          )}

          {/* Spread summary */}
          {result?.type === 'spread' && (
            <div style={{ borderTop:'1px solid var(--border-soft)', paddingTop:'1rem', display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              {[
                { label:'Total Reached', value: result.totalReached, color:'var(--accent-pink)' },
                { label:'Spread Ratio',  value:`${(result.spreadRatio*100).toFixed(1)}%`, color:'var(--accent-lavender)' },
                { label:'Rounds',        value: result.steps?.length, color:'var(--text-secondary)' },
              ].map(row=>(
                <div key={row.label} style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{row.label}</span>
                  <span style={{ fontSize:'0.95rem', fontWeight:700, color:row.color }}>{row.value}</span>
                </div>
              ))}
              <div style={{ height:6, background:'var(--blush-100)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${(result.spreadRatio||0)*100}%`, background:'var(--gradient-accent)', borderRadius:99 }}/>
              </div>
              {/* Show USERNAMES reached each round */}
              {(result.steps||[]).slice(0,4).map(s=>(
                <div key={s.round} style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>
                  <b style={{ color:'var(--text-secondary)' }}>Round {s.round}:</b>{' '}
                  {(s.newlyInfectedNames||[]).join(', ') || '—'}
                </div>
              ))}
            </div>
          )}

          {/* Removal summary */}
          {result?.type === 'removal' && (
            <div style={{ borderTop:'1px solid var(--border-soft)', paddingTop:'1rem', display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Fragments</span>
                <span style={{ fontSize:'0.95rem', fontWeight:700, color: result.componentsAfterRemoval>1?'var(--accent-pink)':'var(--accent-lavender)' }}>
                  {result.componentsAfterRemoval}
                </span>
              </div>
              <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>
                Critical Connectors ({result.articulationPointNames?.length||0})
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.3rem' }}>
                {(result.articulationPointNames||[]).map((name,i)=>(
                  <span key={i} className="badge badge-pink" style={{ fontSize:'0.75rem' }}>{name}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="card fade-up" style={{ animationDelay:'0.1s' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', marginBottom:'1.5rem' }}>
            {mode==='spread' ? 'Infection Wave Analysis' : 'Network Fragmentation Impact'}
          </div>

          {areaData.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
              <div>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'0.5rem' }}>Cumulative Users Reached</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={areaData} margin={{ top:5, right:10, bottom:0, left:0 }}>
                    <defs>
                      <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a67ff7" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#e878ad" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(200,160,210,0.15)" />
                    <XAxis dataKey="round" tick={{ fill:'var(--text-muted)', fontSize:10 }} />
                    <YAxis tick={{ fill:'var(--text-muted)', fontSize:10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-soft)', borderRadius:10, fontSize:11 }} />
                    <Area type="monotone" dataKey="total" stroke="#a67ff7" fill="url(#cGrad)" strokeWidth={2.5} name="Total reached" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'0.5rem' }}>New Users per Round</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={areaData} margin={{ top:5, right:10, bottom:0, left:0 }}>
                    <CartesianGrid stroke="rgba(200,160,210,0.15)" />
                    <XAxis dataKey="round" tick={{ fill:'var(--text-muted)', fontSize:10 }} />
                    <YAxis tick={{ fill:'var(--text-muted)', fontSize:10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-soft)', borderRadius:10, fontSize:11 }} />
                    <Bar dataKey="new" radius={[4,4,0,0]} name="New this round">
                      {areaData.map((_,i)=>(<Cell key={i} fill={`hsl(${300-i*6},60%,${72-i*1.5}%)`} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          ) : result?.type === 'removal' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ padding:'2rem', textAlign:'center', borderRadius:'var(--radius-lg)', background: result.componentsAfterRemoval>1?'rgba(232,120,173,0.07)':'rgba(166,127,247,0.07)', border:`1px solid ${result.componentsAfterRemoval>1?'rgba(232,120,173,0.3)':'rgba(166,127,247,0.3)'}` }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'4rem', lineHeight:1, color: result.componentsAfterRemoval>1?'var(--accent-pink)':'var(--accent-lavender)' }}>
                  {result.componentsAfterRemoval}
                </div>
                <div style={{ color:'var(--text-muted)', fontSize:'0.9rem', marginTop:'0.5rem' }}>
                  {result.componentsAfterRemoval===1 ? 'Network remains connected' : `Network splits into ${result.componentsAfterRemoval} disconnected components`}
                </div>
              </div>
              {(result.articulationPointNames||[]).length > 0 && (
                <div style={{ padding:'1rem', background:'var(--blush-50)', borderRadius:'var(--radius-md)', border:'1px solid var(--border-soft)' }}>
                  <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'0.6rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    Other Critical Connectors
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
                    {(result.articulationPointNames||[]).map((name,i)=>(
                      <span key={i} className="badge badge-lavender" style={{ fontSize:'0.78rem' }}>{name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          ) : (
            <div style={{ height:340, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'0.75rem', background:'linear-gradient(145deg,var(--blush-50),var(--lavender-50))', borderRadius:'var(--radius-lg)', border:'1px dashed var(--border-medium)' }}>
              <BarChart2 size={38} color="var(--text-faint)" />
              <span style={{ color:'var(--text-faint)', fontSize:'0.9rem' }}>Enter a username and run simulation</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
