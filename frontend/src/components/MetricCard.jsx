export default function MetricCard({ title, value, subtitle, icon: Icon, accent = 'pink', trend }) {
  const accentMap = {
    pink:     { bg: 'var(--blush-100)',    color: 'var(--accent-pink)',     glow: 'rgba(232,120,173,0.2)' },
    lavender: { bg: 'var(--lavender-100)', color: 'var(--accent-lavender)', glow: 'rgba(166,127,247,0.2)' },
    mauve:    { bg: 'var(--mauve-100)',    color: 'var(--mauve-400)',        glow: 'rgba(201,174,224,0.3)' },
    rose:     { bg: 'var(--blush-200)',    color: 'var(--blush-400)',        glow: 'rgba(242,168,204,0.3)' },
  };
  const a = accentMap[accent] || accentMap.pink;

  return (
    <div className="card fade-up" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Decorative blob */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: a.bg, opacity: 0.7,
        filter: `blur(20px)`,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {title}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>
            {value ?? '—'}
          </div>
          {subtitle && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{subtitle}</div>
          )}
          {trend !== undefined && (
            <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', color: trend >= 0 ? '#7ec897' : '#e06b8c' }}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        {Icon && (
          <div style={{
            width: 40, height: 40, borderRadius: '12px',
            background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px ${a.glow}`,
          }}>
            <Icon size={18} color={a.color} />
          </div>
        )}
      </div>
    </div>
  );
}
