export default function PageHeader({ title, subtitle, badge }) {
  return (
    <div style={{ marginBottom: '2rem' }} className="fade-up">
      {badge && (
        <span className={`badge badge-lavender`} style={{ marginBottom: '0.6rem' }}>
          {badge}
        </span>
      )}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
        fontWeight: 400, lineHeight: 1.15,
        background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent-lavender) 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '520px' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
