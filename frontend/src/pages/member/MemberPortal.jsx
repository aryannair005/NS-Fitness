import { useState } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import MemberDashboard from './MemberDashboard.jsx';
import Profile from './Profile.jsx';
import PaymentHistory from './PaymentHistory.jsx';


export default function MemberPortal() {
  const { logout } = useAuth();
  const [error,setError] = useState('');
  return <div className="admin-shell"><nav aria-label="Member navigation">
    <NavLink end to="/member">Overview</NavLink><NavLink to="/member/payments">Payment history</NavLink><NavLink to="/member/profile">Profile</NavLink>
    <button className="secondary" onClick={() => logout().catch(() => setError('Sign-out failed. Please retry.'))}>Sign out</button>
  </nav>{error && <p role="alert">{error}</p>}
  <Routes><Route index element={<MemberDashboard />} /><Route path="payments" element={<PaymentHistory />} /><Route path="profile" element={<Profile />} /><Route path="*" element={<Navigate to="/member" replace />} /></Routes></div>;
}
