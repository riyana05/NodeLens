import { useEffect, useState } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Network, Users, GitBranch, Shield, Zap, AlertTriangle, Activity } from 'lucide-react';
import MetricCard  from '../components/MetricCard';
import PageHeader  from '../components/PageHeader';
import GraphCanvas from '../components/GraphCanvas';
import { toCytoscapeElements } from '../hooks/useGraphFetch';
import api from '../api/axios';

export default function Dashboard() {
  const [summary,   setSummary]   = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [elements,  setElements]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [sumRes, fullRes] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/analytics/full'),
        ]);
        setSummary(sumRes.data);
        setAnalytics(fullRes.data);

        const { pagerank, communities, backbone, nameMap = {} } = fullRes.data;

        // Build lookup maps — using username from backend nameMap
        const prMap   = Object.fromEntries((pagerank || []).map(p => [p.id, p.score]));
        const commMap = Object.fromEntries((communities?.members || []).map(m => [m.id, m.communityId]));
        const bkSet   = new Set((backbone || []).map(e => `${e.src}->${e.dst}`));

        // Nodes: use username label from nameMap — never show raw mongoId
        const nodes = (pagerank || []).map(p => ({
          id:    p.id,
          label: p.username || nameMap[p.id] || p.id,
        }));
        const edges = (backbone || []).map(e => ({ src: e.src, dst: e.dst, weight: e.weight }));

        setElements(toCytoscapeElements(nodes, edges, {
          pageRankScores:  prMap,
          communityColors: commMap,
          backboneEdges:   bkSet,
        }));
      } catch (e) {
        setError(e.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stability       = analytics?.stability;
  const echoChambers    = analytics?.echoChambers || [];
  const flaggedChambers = echoChambers.filter(e => e.flagged).length;
  const numCommunities  = analytics?.communities?.numCommunities ?? 0;
  const conflictCount   = stability?.conflictTriads?.length ?? 0;

  const radarData = stability ? [
    { metric: 'Stability',   value: +(stability.globalScore     * 100).toFixed(1) },
    { metric: 'Clustering',  value: +(stability.clusteringCoeff * 100).toFixed(1) },
    { metric: 'Density',     value: +(stability.density         * 100).toFixed(1) },
    { metric: 'Cohesion',    value: Math.min(numCommunities * 12, 100) },
    { metric: 'Safety',      value: flaggedChambers === 0 ? 100 : Math.max(20, 100 - flaggedChambers * 15) },
  ] : [];

  const sparkData = [0.72,0.74,0.70,0.76,0.78,0.75,0.80,
    stability?.globalScore ?? 0.80].map((v,i) => ({ t:`T${i+1}`, v:+(v*100).toFixed(1) }));

  return (
    <div>
      <PageHeader title="Network Dashboard" subtitle="Global health metrics and real-time topology for your nodelens" badge="Live Analytics" />

      {error && (
        <div style={{ background:'rgba(232,120,173,0.1)', border:'1px solid rgba(232,120,173,0.3)', borderRadius:'var(--radius-md)', padding:'0.8rem 1.2rem', color:'#c04878', fontSize:'0.85rem', marginBottom:'1.5rem' }}>
          {error}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(165px,1fr))', gap:'1rem', marginBottom:'2rem' }}>
        <MetricCard title="Total Nodes"     value={loading ? '…' : (summary?.nodeCount ?? 0)}   icon={Users}         accent="pink" />
        <MetricCard title="Total Edges"     value={loading ? '…' : (summary?.edgeCount ?? 0)}   icon={GitBranch}     accent="lavender" />
        <MetricCard title="Stability"       value={stability ? `${(stability.globalScore*100).toFixed(0)}%` : '…'} icon={Shield} accent="mauve" />
        <MetricCard title="Communities"     value={loading ? '…' : numCommunities}              icon={Network}       accent="rose" />
        <MetricCard title="Echo Chambers"   value={loading ? '…' : flaggedChambers}             icon={AlertTriangle} accent="pink" />
        <MetricCard title="Conflict Triads" value={loading ? '…' : conflictCount}               icon={Zap}           accent="lavender" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 310px', gap:'1.5rem', alignItems:'start' }}>
        <div className="card" style={{ padding:'1rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', paddingLeft:'0.4rem' }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'1.15rem' }}>Network Backbone</span>
            <span className="badge badge-lavender">MST view</span>
          </div>
          {loading
            ? <div className="skeleton" style={{ height:460 }} />
            : elements.length > 0
              ? <GraphCanvas elements={elements} showBackboneOnly />
              : (
                <div style={{ height:460, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,var(--blush-50),var(--lavender-50))', borderRadius:'var(--radius-lg)', border:'1px dashed var(--border-medium)', flexDirection:'column', gap:'0.75rem' }}>
                  <Network size={40} color="var(--text-faint)" />
                  <span style={{ color:'var(--text-faint)', fontSize:'0.9rem' }}>Seed the database first — see README</span>
                </div>
              )
          }
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
          <div className="card fade-up">
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.05rem', marginBottom:'1rem' }}>Health Radar</div>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData} margin={{ top:0, right:20, bottom:0, left:20 }}>
                  <PolarGrid stroke="rgba(200,160,210,0.25)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill:'var(--text-secondary)', fontSize:10, fontFamily:'DM Sans' }} />
                  <Radar dataKey="value" stroke="#a67ff7" fill="rgba(166,127,247,0.22)" strokeWidth={2} />
                  <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-soft)', borderRadius:10, fontSize:11 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <div className="skeleton" style={{ height:220 }} />}
          </div>

          <div className="card fade-up" style={{ animationDelay:'0.1s' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.05rem', marginBottom:'1rem' }}>
              <span style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <Activity size={15} color="var(--accent-pink)" /> Stability Trend
              </span>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={sparkData} margin={{ top:5, right:5, bottom:0, left:-20 }}>
                <CartesianGrid stroke="rgba(200,160,210,0.15)" />
                <XAxis dataKey="t" tick={{ fill:'var(--text-faint)', fontSize:9 }} />
                <YAxis domain={[0,100]} tick={{ fill:'var(--text-faint)', fontSize:9 }} />
                <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-soft)', borderRadius:8, fontSize:11 }} formatter={v=>[`${v}%`,'Score']} />
                <Line type="monotone" dataKey="v" stroke="url(#grad)" strokeWidth={2.5} dot={false} />
                <defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#e878ad" /><stop offset="100%" stopColor="#a67ff7" /></linearGradient></defs>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card fade-up" style={{ animationDelay:'0.2s' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.05rem', marginBottom:'0.9rem' }}>Echo Chambers</div>
            {loading
              ? [1,2,3].map(i=><div key={i} className="skeleton" style={{ height:32, marginBottom:6 }}/>)
              : echoChambers.length === 0
                ? <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', textAlign:'center', padding:'0.75rem' }}>No data yet</div>
                : echoChambers.slice(0,5).map(ec=>(
                  <div key={ec.communityId} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.4rem 0', borderBottom:'1px solid var(--border-soft)' }}>
                    <span style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>Community {ec.communityId}</span>
                    <span className={`badge ${ec.flagged ? 'badge-pink' : 'badge-lavender'}`}>
                      {ec.flagged ? '⚠ Isolated' : '✓ Open'}
                    </span>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
