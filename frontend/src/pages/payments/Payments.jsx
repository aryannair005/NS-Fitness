import { useRef, useState } from 'react';
import api from '../../services/api.js';
import { Heading, Load, message, money } from '../admin/shared.jsx';
import { planLabels } from '../admin/planLabels.js';

function termName(term) {
  return [term.memberId?.fullName, planLabels[term.plan] ?? term.plan, term.startDate.slice(0,10)].filter(Boolean).join(' · ');
}

function ReceiptForm({terms, perform, busy}) {
  const key = useRef(crypto.randomUUID());
  function submit(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    fields.amount = Number(fields.amount);
    fields.entryKey = key.current;
    perform(() => api.post('/payments', fields), 'Payment recorded.');
  }
  if (!terms.length) return <p>Add a membership to record its first payment.</p>;
  return <form onSubmit={submit}><fieldset><legend>Record a payment</legend>
    <div className="field-grid"><label>Membership<select name="membershipId" required>{terms.map(t=><option key={t._id} value={t._id}>{termName(t)} · Due {money(t.due)}</option>)}</select></label>
    <label>Amount paid (INR)<input required type="number" name="amount" min=".01" step=".01" /></label>
    <label>Payment date<input name="paymentDate" type="date" required defaultValue={new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})} /></label>
    <label>Payment method<select name="method"><option>Cash</option><option>UPI</option><option>Bank transfer</option></select></label>
    <label>Verification<select name="status"><option value="VERIFIED">Verified receipt</option><option value="PENDING">Pending verification</option></select></label>
    <label>Transfer reference (optional for cash)<input name="transactionReference" maxLength={100} /></label>
    </div></fieldset><button disabled={busy}>Save payment</button></form>;
}

export default function Payments() {
  const [revision,refresh]=useState(0);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [termId,setTermId]=useState('');
  async function perform(action, success) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(success); refresh(r=>r+1); }
    catch(e) {setError(message(e));} finally {setBusy(false);}
  }
  return <div className="admin-shell"><Heading title="Payments" />
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
    <Load key={'ledger'+revision} path="/payments">{({memberships,payments})=><>
      <ReceiptForm terms={memberships} perform={perform} busy={busy}/>
      <label>Filter history by membership<select value={termId} onChange={e=>setTermId(e.target.value)}><option value="">All memberships</option>{memberships.map(t=><option key={t._id} value={t._id}>{termName(t)}</option>)}</select></label>
      <section><h2>Membership balances</h2>{memberships.filter(t=>!termId || t._id===termId).map(t=><div className="row" key={t._id}><span>{termName(t)}<small>{t.status} · Paid {money(t.paid)} of {money(t.amount)}</small></span><span>Due {money(t.due)}</span></div>)}</section>
      <section><h2>Payment history</h2>{!payments.some(p=>!termId || p.membershipId===termId) && <p>No receipts recorded.</p>}
      {payments.filter(p=>!termId || p.membershipId===termId).map(p=>{
        const term=memberships.find(t=>t._id===p.membershipId);
        return <div key={p._id} className="row"><span>{term && termName(term)}<small>{new Date(p.paymentDate).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})} · {p.method} · {p.status}</small>{p.transactionReference && <small>{p.transactionReference}</small>}</span><span>{money(p.amount)}</span>
        {!p.requestId && <button disabled={busy} className="secondary" onClick={()=>perform(()=>api.patch('/payments/'+p._id,{status:p.status==='PENDING'?'VERIFIED':'PENDING'}),'Receipt updated.')}>{p.status==='PENDING'?'Verify':'Mark pending'}</button>}</div>;
      })}</section>
    </>}</Load>
  </div>;
}
