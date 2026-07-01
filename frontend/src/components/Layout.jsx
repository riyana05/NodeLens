import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Sidebar from './Sidebar';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar user={user} onLogout={handleLogout} />
      <main style={{
        flex: 1, padding: '2rem 2.5rem',
        overflowY: 'auto', minWidth: 0,
        maxWidth: '100%',
      }}>
        <Outlet />
      </main>
    </div>
  );
}
