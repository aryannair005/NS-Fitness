import { Link } from 'react-router-dom';
import { Load, money } from '../admin/shared.jsx';
import { planLabels } from '../admin/planLabels.js';
import PaymentQr from '../payments/PaymentQr.jsx';
import { displayDate } from './dates.js';

export default function MemberDashboard() {
  return <><h1 className="text-4xl font-semibold">My membership</h1>
    <Load path="/member/membership">{({featured, memberships}) => featured ? <>
      <section className="grid gap-4"><h2>{planLabels[featured.plan] ?? featured.plan} · {featured.membershipStatus}</h2>
        <p>{displayDate(featured.startDate)} – {displayDate(featured.endDate)}</p>
        <dl className="metrics">{[['Plan fee',featured.amount],['Verified payments',featured.paid],['Balance due',featured.due]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{money(value)}</dd></div>)}</dl>
        <p>Payment status · {featured.status}</p><Link className="underline" to="/member/payments">View payment history</Link>
      </section>
      {memberships.length > 1 && <section><h2>All membership periods</h2>{memberships.map(t=><div className="row" key={t._id}><span>{planLabels[t.plan] ?? t.plan}<small>{displayDate(t.startDate)} – {displayDate(t.endDate)}</small></span><span>{t.membershipStatus}</span></div>)}</section>}
    </> : <p>No membership period has been recorded yet. Contact the gym for assistance.</p>}</Load>
    <PaymentQr />
  </>;
}
