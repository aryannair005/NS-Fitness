import { Load, money } from '../admin/shared.jsx';
import { planLabels } from '../admin/planLabels.js';
import { displayDate } from './dates.js';

export default function PaymentHistory() {
  return <><h1 className="text-4xl font-semibold">Payment history</h1>
    <Load path="/member/payments">{({payments,memberships})=><>
      <section><h2>Balances by membership</h2>{memberships.length === 0 && <p>No memberships recorded yet.</p>}
        {memberships.map(t=><div className="row" key={t._id}><span>{planLabels[t.plan] ?? t.plan}<small>{displayDate(t.startDate)} – {displayDate(t.endDate)}</small></span><span>{money(t.due)} due<small>{t.status}</small></span></div>)}</section>
      <section><h2>Receipts</h2>{payments.length === 0 && <p>No payments recorded yet.</p>}
        {payments.map(p=>{
          const term=memberships.find(t=>t._id===p.membershipId);
          return <div className="row" key={p._id}><span>{displayDate(p.paymentDate)} · {p.method}
            {term && <small>{planLabels[term.plan] ?? term.plan} · Started {displayDate(term.startDate)}</small>}
            {p.transactionReference && <small>Reference {p.transactionReference}</small>}</span><span>{money(p.amount)}<small>{p.status}</small></span></div>;
        })}</section></>}</Load></>;
}
