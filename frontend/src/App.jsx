import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Home, { Signup } from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import api from './services/api.js';
import PaymentQr from './pages/payments/PaymentQr.jsx';
import MemberPortal from './pages/member/MemberPortal.jsx';
import Admin from './pages/admin/Admin.jsx';

function PublicLayout() {
  const [contact, setContact] = useState({ownerName:'Nitesh Shah',contactNumber:'+91 78359 05504'});
  useEffect(() => {
    const controller = new AbortController();
    const load = () => api.get('/gym-contact', {signal:controller.signal})
      .then(({data}) => setContact(data)).catch(() => {});
    load();
    window.addEventListener('gym-settings-saved', load);
    return () => { controller.abort(); window.removeEventListener('gym-settings-saved', load); };
  }, []);
  return <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 p-6 sm:p-12">
    <header className="border-b border-white/20 pb-5 font-bold tracking-widest"><Link to="/">NS FITNESS</Link></header>
    <main><Routes>
      <Route index element={<Home />} />
      <Route path="/signup" element={<Signup contact={contact} />} />
      <Route path="/pay" element={<PaymentQr />} />
      <Route path="*" element={<SessionRoutes />} />
    </Routes></main>
    <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/20 pt-5 text-sm text-neutral-300">
      <p>{contact.ownerName} &middot; <a href={'tel:'+contact.contactNumber}>{contact.contactNumber}</a></p>
      <div className="flex flex-wrap gap-4"><span>Built by Aryan Nair</span>
        <a className="underline" href="https://github.com/aryannair005">GitHub</a>
        <a className="underline" href="https://www.linkedin.com/in/aryan-nair---/">LinkedIn</a>
      </div>
    </footer>
  </div>;
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
  return <BrowserRouter><AuthProvider><PublicLayout /></AuthProvider></BrowserRouter>;
}
