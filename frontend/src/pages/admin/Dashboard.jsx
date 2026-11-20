import { Link } from 'react-router-dom';
import { Heading, Load, money } from './shared.jsx';

const metrics = [['total','Total members'],['active','Active memberships'],['expired','Expired members'],['tomorrow','Expiring tomorrow'],['unpaid','Pending payments'],['revenue','Monthly revenue']];

export default function Dashboard() {
  return <><Heading title="Gym overview" add /><Load path="/admin/dashboard">{({stats, registrations, payments}) => <>
    <dl className="metrics">{metrics.map(([key,label]) => <div key={key}><dt>{label}</dt><dd>{key === 'revenue' ? money(stats[key]) : stats[key]}</dd></div>)}</dl>
    <div className="activity"><section><h2>Recent registrations</h2>{registrations.length ? registrations.map(m => <Link className="row" key={m._id} to={'/admin/members/'+m._id}>{m.fullName}<small>{m.joiningDate.slice(0,10)}</small></Link>) : <p>No members registered yet.</p>}</section>
    <section><h2>Recent payments</h2>{payments.length ? payments.map(p => <div className="row" key={p.id}>{p.name}<span>{money(p.amount)}</span></div>) : <p>No payments recorded yet.</p>}</section></div>
  </>}</Load></>;
}

