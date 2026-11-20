import { useState } from 'react';
import api from '../../services/api.js';
import { message, money } from './shared.jsx';
import { planLabels } from './planLabels.js';

export default function TermHistory({ member, memberships, suggestedStart, onSaved }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(action, notice) {
    setBusy(true);
    setError('');
    try { await action(); onSaved(notice); }
    catch (e) { setError(message(e)); setBusy(false); }
  }
  function renew(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    save(() => api.post('/memberships', { ...fields, memberId: member._id, amount: Number(fields.amount) }), 'Membership renewed.');
  }
  const previous = memberships[0];
  return <section><div className="section-heading"><h2>Membership history</h2>
    {member.isActive && <button className="secondary" onClick={() => setOpen(!open)}>{open ? 'Cancel renewal' : 'Renew membership'}</button>}</div>
    {open && <form onSubmit={renew}><fieldset><legend>Renew membership</legend><div className="field-grid">
      <label>Plan<select name="plan" defaultValue={planLabels[previous?.plan] ? previous.plan : 'Monthly'}>
      {Object.entries(planLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Start date<input name="startDate" type="date" defaultValue={suggestedStart} required /></label>
      <label>Fee (INR)<input name="amount" type="number" min="0" step=".01" defaultValue={previous?.amount} required /></label>
    </div></fieldset><button disabled={busy}>Save renewal</button></form>}
    {memberships.map(t => <div className="row" key={t._id}><span>{planLabels[t.plan] ?? t.plan}<small>{t.startDate.slice(0,10)} – {t.endDate.slice(0,10)}</small><small>{t.status} · {money(t.amount)}</small></span>
      {member.isActive && t.status !== 'EXPIRED' && <button className="secondary" disabled={busy} onClick={() => save(() => api.put('/memberships/'+t._id, { suspended: !t.suspended }), t.suspended ? 'Membership resumed.' : 'Membership suspended.')}>{t.suspended ? 'Resume' : 'Suspend'}</button>}
    </div>)}
    {error && <p role="alert">{error}</p>}</section>;
}
