import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, GitBranch, Users, Zap,
  TrendingUp, AlertTriangle, Network
} from 'lucide-react';

const nav = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard',   badge: null },
  { to: '/trust',        icon: GitBranch,       label: 'Trust Paths', badge: 'F8·F13' },
  { to: '/communities',  icon: Users,           label: 'Communities', badge: 'F1·F3·F9·F12' },
  { to: '/simulations',  icon: Zap,             label: 'Simulations', badge: 'F5·F10' },
  { to: '/influence',    icon: TrendingUp,      label: 'Influence',   badge: 'F6' },
  { to: '/risk',         icon: AlertTriangle,   label: 'Risk Forecast',badge: 'F2' },
];

export default function Sidebar({ user, onLogout }) {
  return (
    <aside style={{
      width: '230px', flexShrink: 0,
      background: 'rgba(253,244,247,0.92)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--border-soft)',
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1rem',
      position: 'sticky', top: 0, height: '100vh',
      boxShadow: '2px 0 24px rgba(168,100,180,0.06)',
      overflowY: 'auto',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '2rem', paddingLeft: '0.25rem' }}>
        <div style={{
          width: 38, height: 38, borderRadius: '11px',
          background: 'var(--gradient-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(232,120,173,0.4)',
          flexShrink: 0,
        }}>
          <Network size={18} color="#fff" strokeWidth={2.2} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            NodeLens
          </div>
          <div style={{ fontSize: '0.67rem', color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Analytics
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
        <div style={{ fontSize: '0.67rem', color: 'var(--text-faint)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 0.75rem', marginBottom: '0.5rem' }}>
          Modules
        </div>
        {nav.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)',
            textDecoration: 'none', fontSize: '0.865rem', fontWeight: 500,
            transition: 'all 0.18s ease',
            color:      isActive ? 'var(--accent-lavender)' : 'var(--text-secondary)',
            background: isActive ? 'rgba(166,127,247,0.12)' : 'transparent',
            borderLeft: isActive ? '2.5px solid var(--accent-lavender)' : '2.5px solid transparent',
          })}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Icon size={15} />
              {label}
            </span>
            {badge && (
              <span style={{
                fontSize: '0.6rem', color: 'var(--text-faint)',
                background: 'var(--blush-100)', padding: '1px 5px',
                borderRadius: '99px', fontWeight: 600,
              }}>{badge}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div style={{
          marginTop: 'auto', borderTop: '1px solid var(--border-soft)',
          paddingTop: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--gradient-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-lavender)',
              flexShrink: 0,
            }}>
              {(user.displayName || user.username || '?')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName || user.username}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          </div>
          <button onClick={onLogout} style={{
            marginTop: '0.75rem', width: '100%', padding: '0.5rem',
            background: 'transparent', border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            fontSize: '0.78rem', color: 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--blush-100)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
