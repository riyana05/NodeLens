import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ZAxis, CartesianGrid, ReferenceLine } from 'recharts';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import api from '../api/axios';

const riskColor  = s => s >= 0.7 ? '#e878ad' : s >= 0.4 ? '#c9aee0' : '#a67ff7';
const riskLabel  = s => s >= 0.7 ? 'High' : s >= 0.4 ? 'Medium' : 'Low';
const RiskBar = ({ value }) => (
  <div style={{ flex:1, height:5, background:'var(--blush-100)', borderRadius:99, overflow:'hidden' }}>
    <div style={{ height:'100%', width:`${value*100}%`, borderRadius:99, background: value>=0.7?'var(--gradient-accent)':value>=0.4?'var(--mauve-300)':'var(--lavender-300)' }}/>
  </div>
);

export default function RiskPage() {
  const [risks,   setRisks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  const load = () => {
    setLoading(true);
    api.get('/analytics/friendship-risk')
      .then(r => setRisks(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const high   = risks.filter(r => r.riskScore >= 0.7);
  const medium = risks.filter(r => r.riskScore >= 0.4 && r.riskScore < 0.7);
  const low    = risks.filter(r => r.riskScore <  0.4);
  const displayed = filter==='high'?high : filter==='medium'?medium : filter==='low'?low : risks;

  // Scatter uses usernames for tooltip
  const scatterData = risks.slice(0,80).map(r => ({
    x:    parseFloat((r.velocity*100).toFixed(3)),
    y:    parseFloat((r.riskScore*100).toFixed(1)),
    risk: r.riskScore,
    // Use nodeAName/nodeBName from backend
    a:    r.nodeAName || r.nodeA || '?',
    b:    r.nodeBName || r.nodeB || '?',
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-soft)', borderRadius:10, padding:'0.6rem 0.9rem', fontSize:11 }}>
        {/* Shows username names in tooltip */}
        <div style={{ fontWeight:600, color:'var(--text-secondary)', marginBottom:4 }}>{d.a} → {d.b}</div>
        <div>Velocity: <b style={{ color:'var(--accent-lavender)' }}>{d.x}%</b></div>
        <div>Risk: <b style={{ color:riskColor(d.risk) }}>{d.y}%</b></div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Friendship Risk Forecast" subtitle="Sliding-window temporal trust-velocity analysis — predicts which connections are likely to dissolve" badge="F2" />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', marginBottom:'2rem' }}>
        <MetricCard title="High Risk"   value={loading?'…':high.length}   icon={AlertTriangle} accent="pink"     subtitle="≥70% breakage risk" />
        <MetricCard title="Medium Risk" value={loading?'…':medium.length} icon={TrendingDown}  accent="mauve"    subtitle="40–70% risk" />
        <MetricCard title="Stable"      value={loading?'…':low.length}    icon={TrendingUp}    accent="lavender" subtitle="<40% risk" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:'1.5rem', alignItems:'start' }}>

        {/* Scatter chart */}
        <div className="card fade-up">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.4rem' }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem' }}>Risk Distribution</span>
            <button className="btn btn-ghost" onClick={load} style={{ padding:'0.3rem 0.7rem', fontSize:'0.75rem', gap:'0.35rem' }}>
              <RefreshCw size={11}/> Refresh
            </button>
          </div>
          <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'1.25rem' }}>
            X = trust change velocity · Y = predicted risk · Hover dots to see user names
          </p>
          {loading
            ? <div className="skeleton" style={{ height:340 }} />
            : (
              <ResponsiveContainer width="100%" height={340}>
                <ScatterChart margin={{ top:10, right:20, bottom:20, left:0 }}>
                  <CartesianGrid stroke="rgba(200,160,210,0.15)" />
                  <XAxis dataKey="x" name="Velocity" unit="%" tick={{ fill:'var(--text-muted)', fontSize:10 }} label={{ value:'Velocity (%/period)', position:'insideBottom', offset:-8, fill:'var(--text-muted)', fontSize:10 }} />
                  <YAxis dataKey="y" name="Risk" unit="%" tick={{ fill:'var(--text-muted)', fontSize:10 }} label={{ value:'Risk (%)', angle:-90, position:'insideLeft', offset:10, fill:'var(--text-muted)', fontSize:10 }} />
                  <ZAxis range={[30,90]} />
                  <ReferenceLine y={70} stroke="rgba(232,120,173,0.4)" strokeDasharray="4 4" label={{ value:'High', fill:'var(--accent-pink)', fontSize:9 }} />
                  <ReferenceLine y={40} stroke="rgba(201,174,224,0.5)" strokeDasharray="4 4" label={{ value:'Med', fill:'var(--mauve-400)', fontSize:9 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray:'3 3', stroke:'var(--border-medium)' }} />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry,i)=>(<Cell key={i} fill={riskColor(entry.risk)} fillOpacity={0.7} />))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Risk list — shows usernames */}
        <div className="card fade-up" style={{ animationDelay:'0.1s', padding:0 }}>
          <div style={{ display:'flex', borderBottom:'1px solid var(--border-soft)' }}>
            {[{id:'all',label:'All'},{id:'high',label:'High'},{id:'medium',label:'Medium'},{id:'low',label:'Low'}].map(f=>(
              <button key={f.id} onClick={()=>setFilter(f.id)} style={{ flex:1, padding:'0.65rem 0.3rem', background:'none', border:'none', cursor:'pointer', fontSize:'0.75rem', fontWeight:500, color: filter===f.id?'var(--accent-lavender)':'var(--text-muted)', borderBottom: filter===f.id?'2px solid var(--accent-lavender)':'2px solid transparent' }}>
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ padding:'0.75rem', maxHeight:420, overflowY:'auto' }}>
            {loading
              ? [1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{ height:62, marginBottom:8 }}/>)
              : displayed.length === 0
                ? <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.85rem' }}>
                    {risks.length===0 ? 'No temporal data yet — interactions needed' : 'No connections in this tier'}
                  </div>
                : displayed.map((r,i) => (
                  <div key={i} style={{ padding:'0.65rem 0.75rem', marginBottom:'0.4rem', borderRadius:'var(--radius-sm)', background: r.riskScore>=0.7?'rgba(232,120,173,0.06)':r.riskScore>=0.4?'rgba(201,174,224,0.08)':'rgba(166,127,247,0.06)', border:`1px solid ${riskColor(r.riskScore)}28` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.4rem' }}>
                      {/* Username → Username instead of mongoId → mongoId */}
                      <span style={{ fontSize:'0.85rem', fontWeight:500, color:'var(--text-secondary)' }}>
                        {r.nodeAName || r.nodeA} → {r.nodeBName || r.nodeB}
                      </span>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                        <span className={`badge ${r.riskScore>=0.7?'badge-pink':r.riskScore>=0.4?'badge-mauve':'badge-lavender'}`} style={{ fontSize:'0.65rem' }}>
                          {riskLabel(r.riskScore)}
                        </span>
                        <span style={{ fontSize:'0.82rem', fontWeight:700, color:riskColor(r.riskScore) }}>
                          {(r.riskScore*100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                      <RiskBar value={r.riskScore} />
                      <span style={{ fontSize:'0.68rem', color:'var(--text-faint)', whiteSpace:'nowrap' }}>
                        v={r.velocity?.toFixed(4)}
                      </span>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
