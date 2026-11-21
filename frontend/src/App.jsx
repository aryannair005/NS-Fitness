import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import api from './services/api.js';
import PaymentQr from './pages/payments/PaymentQr.jsx';
import MemberPortal from './pages/member/MemberPortal.jsx';
import Admin from './pages/admin/Admin.jsx';

function GymFooter() {
  const { user } = useAuth();
  const [contact, setContact] = useState(null);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const load = () => api.get('/settings', {signal:controller.signal})
      .then(({data}) => setContact(data.settings)).catch(() => {});
    load();
    window.addEventListener('gym-settings-saved', load);
    return () => { controller.abort(); window.removeEventListener('gym-settings-saved', load); };
  }, [user]);
  const phone = contact?.contactNumber || '+91 78359 05504';
  return <footer className="mt-auto border-t border-white/20 pt-5 text-sm text-neutral-300">
    {contact?.ownerName || 'Nitesh Shah'} &middot; <a href={'tel:'+phone}>{phone}</a>
  </footer>;
}

function SessionRoutes() {
  const { user, state, restore } = useAuth();
  if (state === 'loading') return <p role="status">Checking session...</p>;
  if (state === 'offline') return <section><p role="alert">The gym portal is unavailable.</p><button onClick={restore}>Retry connection</button></section>;
  const home = user ? (user.role === 'ADMIN' ? '/admin' : '/member') : '/login';
  return <Routes>
    <Route path="/login" element={user ? <Navigate to={home} replace /> : <><Login /><Link className="underline" to="/pay">Pay the gym by QR code</Link></>} />
    {user?.role === 'ADMIN' && <Route path="/admin/*" element={<Admin />} />}
    {user?.role === 'MEMBER' && <Route path="/member/*" element={<MemberPortal />} />}
    <Route path="*" element={<Navigate to={home} replace />} />
  </Routes>;
}

export default function App() {
  return <BrowserRouter><AuthProvider>
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 p-6 sm:p-12">
      <header className="border-b border-white/20 pb-5 font-bold tracking-widest">NS FITNESS</header>
      <Routes>
        <Route path="/pay" element={<PaymentQr />} />
        <Route path="*" element={<SessionRoutes />} />
      </Routes>
      <GymFooter />
    </main>
  </AuthProvider></BrowserRouter>;
}
