import { ArrowUpRight, CalendarDays, CreditCard, Dumbbell, ReceiptText } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import Login from './Login.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import './home.css';

const features = [
  [CalendarDays, 'Membership plans', 'Choose 1, 3, 6, or 12 months. Check your expiry date and upcoming renewals in your portal.'],
  [ReceiptText, 'Payment history', 'See what you’ve paid, what’s due, and the receipts recorded by the gym.'],
  [CreditCard, 'Pay by QR', 'Open the gym’s payment QR code and scan it with your preferred UPI app.'],
];

export default function Home() {
  const { user } = useAuth();
  return <div className="gym-home">
    <section className="gym-hero">
      <div className="gym-rings" aria-hidden="true" />
      <div className="gym-intro">
        <Dumbbell aria-hidden="true" size={36} strokeWidth={1.4} />
        <h1>NS <em>Fitness</em></h1>
        <p>Your gym membership in one place. Choose your plan, track your renewals, and pay the gym.</p>
        <Link className="gym-cta" to={user ? (user.role === 'ADMIN' ? '/admin' : '/member') : '/signup'}>
          {user ? 'Open dashboard' : 'Sign up'} <ArrowUpRight size={19} aria-hidden="true" />
        </Link>
        {!user && <Link className="gym-login" to="/login">Already a member? Sign in</Link>}
      </div>
    </section>
    <section aria-labelledby="features-heading">
      <h2 id="features-heading">Inside your membership</h2>
      <div className="gym-features">{features.map(([Icon,title,description]) =>
        <article key={title}><Icon size={26} strokeWidth={1.5} aria-hidden="true" /><h3>{title}</h3><p>{description}</p>
          {title === 'Pay by QR' && <Link to="/pay">Open payment QR ↗</Link>}
        </article>)}</div>
    </section>
  </div>;
}

export function Signup({contact}) {
  const { user } = useAuth();
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/member'} replace />;
  return <section className="gym-signup">
    <h1>Join NS Fitness</h1>
    <p>Call {contact.ownerName} to choose a membership plan and register your phone number. The gym will give you a password for your member portal.</p>
    <a className="gym-cta" href={'tel:'+contact.contactNumber.replace(/\s/g,'')}>Call {contact.contactNumber}</a>
    <Login embedded />
  </section>;
}
