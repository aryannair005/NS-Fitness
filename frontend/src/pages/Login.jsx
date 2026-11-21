import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordField from '../components/PasswordField.jsx';

export default function Login({ embedded = false }) {
  const { login } = useAuth();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm();
  async function submit(values) {
    try { await login(values); }
    catch (error) { setError('root', { message: error.response?.data?.message || 'Could not reach the gym portal. Try again.' }); }
  }
  return <form className="grid w-full max-w-sm gap-5" onSubmit={handleSubmit(submit)}>
    {embedded ? <h2 className="text-xl font-semibold">Sign in with your gym-issued password</h2> : <h1 className="text-4xl font-semibold tracking-tight">Sign in</h1>}
    <label>Phone number<input required type="tel" autoComplete="username" {...register('mobile')} /></label>
    <PasswordField label="Password" required autoComplete="current-password" {...register('password')} />
    {errors.root && <p role="alert">{errors.root.message}</p>}
    <button disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
  </form>;
}
