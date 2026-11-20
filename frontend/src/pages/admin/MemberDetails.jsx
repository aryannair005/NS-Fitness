import TermHistory from './TermHistory.jsx';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api from '../../services/api.js';
import { Heading, Load, message } from './shared.jsx';
import MemberForm from './MemberForm.jsx';

export default function MemberDetails({ edit }) {
  const {id} = useParams();
  const {state, key} = useLocation();
  const [notice,setNotice] = useState('');
  const [rev,setRev] = useState(0);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function deactivate() {
    if (!window.confirm('Deactivate this member and block their login?')) return;
    setBusy(true);
    setError('');
    try { await api.patch('/admin/members/'+id+'/deactivate'); setRev(rev+1); }
    catch(e) {setError(message(e));} finally { setBusy(false); }
  }
  return <Load key={id+'-'+rev+'-'+key} path={'/admin/members/'+id}>{({member,memberships,suggestedStart}) => edit ? <MemberForm member={member}/> : <>
    <Heading title={member.fullName}/>{state?.notice && !rev && <p role="status">{state.notice}</p>}
    <dl className="profile">{[['Login access',member.isActive?'Enabled':'Deactivated'],['Login email',member.email],['Mobile',member.mobile],['Father’s name',member.fatherName],['Address',member.address],['Joining date',member.joiningDate.slice(0,10)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {notice && <p role="status">{notice}</p>}
    <TermHistory member={member} memberships={memberships} suggestedStart={suggestedStart} onSaved={text => { setNotice(text); setRev(value => value + 1); }} />
    <div className="controls"><Link className="action" to={'/admin/members/'+id+'/edit'}>Edit member</Link>{member.isActive && <button className="secondary" disabled={busy} onClick={deactivate}>Deactivate member</button>}</div>{error && <p role="alert">{error}</p>}
  </>}</Load>;
}


