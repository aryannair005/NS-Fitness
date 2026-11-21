import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

export default function ChangePassword() {
  const { user, restore } = useAuth();
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm();
  const admin = user.role === 'ADMIN';
  async function submit(values) {
    try {
      await api.patch('/auth/password', values);
      reset();
      setSaved(true);
    } catch (error) {
      if (error.response?.status === 401) return restore();
      setError('root', { message: error.response?.data?.message || 'Could not update your password. Please try again.' });
    }
  }
  return <section className="grid w-full max-w-sm gap-5">
    <h1 className="text-4xl font-semibold">Change password</h1>
    {saved ? <p role="status">Password updated. Use your new password the next time you sign in.</p> :
      <form className="grid gap-5" onSubmit={handleSubmit(submit)}>
        <label>Old password<input required type="password" autoComplete="current-password" {...register('oldPassword')} /></label>
        <label>New password<input required type="password" minLength={12} autoComplete="new-password" aria-describedby="password-length" {...register('newPassword')} /></label>
        <small id="password-length">Use at least 12 characters.</small>
        {errors.root && <p role="alert">{errors.root.message}</p>}
        <button disabled={isSubmitting}>{isSubmitting ? 'Updating…' : 'Update password'}</button>
      </form>}
    <Link className="underline" to={admin ? '/admin/settings' : '/member/profile'}>Back to {admin ? 'settings' : 'profile'}</Link>
  </section>;
}
