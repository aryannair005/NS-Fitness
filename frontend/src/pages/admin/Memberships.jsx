import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Heading, Load } from './shared.jsx';
import { planLabels } from './planLabels.js';

export default function Memberships() {
  const [filter, setFilter] = useState('');
  return <><Heading title="Memberships" /><label>Status
    <select value={filter} onChange={e => setFilter(e.target.value)}>
      <option value="">All statuses</option>
      {['ACTIVE','EXPIRING TOMORROW','EXPIRED','SUSPENDED','SCHEDULED'].map(s => <option key={s}>{s}</option>)}
    </select></label>
    <Load path="/memberships">{({memberships}) => {
      const rows = memberships.filter(t => !filter || t.status === filter);
      return <section>{rows.length ? rows.map(t => <Link className="row" key={t._id} to={'/admin/members/'+t.memberId._id}>
        <span>{t.memberId.fullName}<small>{planLabels[t.plan] ?? t.plan} · Ends {t.endDate.slice(0,10)}</small></span>
        <span>{t.status}</span></Link>) : <p>No matching memberships.</p>}</section>;
    }}</Load></>;
}
