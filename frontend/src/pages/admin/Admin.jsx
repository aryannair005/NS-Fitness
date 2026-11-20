import { useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { message } from './shared.jsx';
import Payments from '../payments/Payments.jsx';
import Settings from '../payments/Settings.jsx';
import Dashboard from './Dashboard.jsx';
import Memberships from './Memberships.jsx';
import Members from './Members.jsx';
import MemberDetails from './MemberDetails.jsx';
import MemberForm from './MemberForm.jsx';

export default function Admin() {
  const { logout } = useAuth();
  const [error, setError] = useState('');
  return <div className="admin-shell">
    <nav aria-label="Admin navigation"><NavLink end to="/admin">Overview</NavLink><NavLink to="/admin/members">Members</NavLink><NavLink to="/admin/memberships">Memberships</NavLink><NavLink to="/admin/payments">Payments</NavLink><NavLink to="/admin/settings">Settings</NavLink>
      <button className="secondary" onClick={() => logout().catch(e => setError(message(e)))}>Sign out</button></nav>
    {error && <p role="alert">{error}</p>}
    <Routes>
      <Route path="memberships" element={<Memberships />} />
      <Route path="payments" element={<Payments />} />
      <Route path="settings" element={<Settings />} />
      <Route index element={<Dashboard />} />
      <Route path="members" element={<Members />} />
      <Route path="members/new" element={<MemberForm />} />
      <Route path="members/:id" element={<MemberDetails />} />
      <Route path="members/:id/edit" element={<MemberDetails edit />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  </div>;
}


