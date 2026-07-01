import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout      from './components/Layout';
import Login       from './pages/Login';
import Register    from './pages/Register';
import Dashboard   from './pages/Dashboard';
import TrustRoute  from './pages/TrustRoute';
import Communities from './pages/Communities';
import Simulations from './pages/Simulations';
import Influence   from './pages/Influence';
import RiskPage    from './pages/RiskPage';

const Private = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader" />;
  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Private><Layout /></Private>}>
          <Route index             element={<Dashboard />} />
          <Route path="trust"      element={<TrustRoute />} />
          <Route path="communities"element={<Communities />} />
          <Route path="simulations"element={<Simulations />} />
          <Route path="influence"  element={<Influence />} />
          <Route path="risk"       element={<RiskPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
