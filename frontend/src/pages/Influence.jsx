import { useEffect, useState } from 'react';
import { TrendingUp, Crown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, CartesianGrid } from 'recharts';
import PageHeader from '../components/PageHeader';
import api from '../api/axios';

export default function Influence() {
  const [ranks,   setRanks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/pagerank')
      .then(r => setRanks(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const top20 = ranks.slice(0, 20);
  const maxScore = Math.max(...top20.map(r => r.score), 0.001);
  const podiumColors = ['#e878ad', '#a67ff7', '#c9aee0'];

  // Use username from backend — never show raw ID
  const chartData = top20.map((r, i) => ({
    name:  r.username || r.id,           // ← username label
    score: parseFloat((r.score * 100).toFixed(3)),
    rank:  i + 1,
  }));

  return (
    <div>
      <PageHeader title="Influence Index" subtitle="Trust-weighted PageRank — ranks users by systemic importance across the network topology, not raw follower counts" badge="F6" />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'1.5rem', alignItems:'start' }}>

        {/* Bar chart — Y axis shows username */}
        <div className="card fade-up">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'1.15rem' }}>Top 20 by PageRank</span>
            <span className="badge badge-lavender"><TrendingUp size={10}/> Damping 0.85</span>
          </div>
          {loading
            ? <div className="skeleton" style={{ height:440 }} />
            : (
              <ResponsiveContainer width="100%" height={Math.max(300, top20.length * 22)}>
                <BarChart data={chartData} layout="vertical" margin={{ left:10, right:55, top:5, bottom:5 }}>
                  <CartesianGrid stroke="rgba(200,160,210,0.12)" horizontal={false} />
                  <XAxis type="number" tick={{ fill:'var(--text-muted)', fontSize:10 }} tickFormatter={v=>`${v}%`} />
                  {/* Shows username on Y axis */}
                  <YAxis type="category" dataKey="name" tick={{ fill:'var(--text-secondary)', fontSize:11, fontFamily:'DM Sans' }} width={80} />
                  <Tooltip
                    formatter={(v,_,props)=>[`${v}%`, `Rank #${props.payload.rank}`]}
                    contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-soft)', borderRadius:10, fontSize:11 }}
                    labelStyle={{ color:'var(--text-secondary)', fontWeight:500 }}
                  />
                  <Bar dataKey="score" radius={[0,5,5,0]}>
                    <LabelList dataKey="score" position="right" formatter={v=>`${v}%`} style={{ fill:'var(--text-muted)', fontSize:9 }} />
                    {chartData.map((_,i)=>(
                      <Cell key={i} fill={i<3 ? podiumColors[i] : `hsl(${290-i*3},55%,${74-i*1.2}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Leaderboard — shows username */}
        <div className="card fade-up" style={{ animationDelay:'0.1s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1.25rem' }}>
            <Crown size={16} color="var(--accent-pink)" />
            <span style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem' }}>Influence Leaderboard</span>
          </div>

          {loading
            ? [1,2,3,4,5,6,7,8].map(i=><div key={i} className="skeleton" style={{ height:52, marginBottom:8 }}/>)
            : top20.slice(0,10).map((r,i)=>{
                const pct = (r.score / maxScore) * 100;
                const isPodium = i < 3;
                return (
                  <div key={r.id||i} style={{ marginBottom:'0.7rem', padding:'0.6rem 0.8rem', borderRadius:'var(--radius-sm)', background: isPodium?`linear-gradient(135deg,${podiumColors[i]}18,${podiumColors[i]}08)`:'transparent', border:`1px solid ${isPodium?podiumColors[i]+'30':'var(--border-soft)'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                        <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, background: isPodium?podiumColors[i]:'var(--mauve-100)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:700, color:isPodium?'#fff':'var(--text-secondary)', boxShadow: isPodium?`0 2px 8px ${podiumColors[i]}50`:'none' }}>
                          {i+1}
                        </div>
                        {/* Username — clean display name */}
                        <span style={{ fontSize:'0.88rem', fontWeight:500, color:'var(--text-secondary)' }}>
                          {r.username || r.id}
                        </span>
                      </div>
                      <span style={{ fontSize:'0.8rem', color: isPodium?podiumColors[i]:'var(--accent-lavender)', fontWeight:700 }}>
                        {(r.score*100).toFixed(3)}%
                      </span>
                    </div>
                    <div style={{ height:3, background:'var(--blush-100)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:99, width:`${pct}%`, background: isPodium?podiumColors[i]:'var(--mauve-300)', transition:'width 0.6s ease' }}/>
                    </div>
                  </div>
                );
              })
          }
          {!loading && ranks.length === 0 && (
            <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.85rem' }}>No data yet — seed the database first</div>
          )}
        </div>
      </div>
    </div>
  );
}
