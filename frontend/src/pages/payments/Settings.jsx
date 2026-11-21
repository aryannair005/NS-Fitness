import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import { Heading, Load, message } from '../admin/shared.jsx';

function SettingsForm({settings}) {
  const [qr,setQr]=useState(settings.upiQrCode);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  function choose(event) {
    const file=event.target.files[0];
    if (!file) return;
    setError(''); setNotice('');
    if (!['image/png','image/jpeg'].includes(file.type) || file.size>512*1024) {setError('Select a PNG or JPEG up to 512 KB.');return;}
    setBusy(true);
    const reader=new FileReader();
    reader.onload=()=>setQr(reader.result);
    reader.onerror=()=>setError('Could not read the image.');
    reader.onloadend=()=>setBusy(false);
    reader.readAsDataURL(file);
  }
  async function save(event) {
    event.preventDefault();
    const fields=Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setNotice(''); setError('');
    try {await api.put('/settings',{...fields,upiQrCode:qr});window.dispatchEvent(new Event('gym-settings-saved'));setNotice('Gym settings saved.');}
    catch(e){setError(message(e));} finally {setBusy(false);}
  }
  return <form onSubmit={save}><div className="field-grid">
    <label>Owner name<input required name="ownerName" defaultValue={settings.ownerName}/></label>
    <label>Contact number<input required type="tel" name="contactNumber" defaultValue={settings.contactNumber}/></label>
    <label>UPI QR image (PNG or JPEG, up to 512 KB)<input type="file" disabled={busy} accept="image/png,image/jpeg" onChange={choose}/></label>
    </div>{qr && <img alt="Current payment QR" src={qr} width="180"/>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}<button disabled={busy}>Save settings</button></form>;
}
export default function Settings() {
  const { user } = useAuth();
  return <><Heading title="Gym settings"/>
    <section className="grid gap-2"><h2>Personal details</h2><p>Login phone number · {user.mobile}</p>
      <Link className="underline" to="/account/password">Change password</Link>
    </section>
    <Load path="/settings">{({settings})=><SettingsForm settings={settings}/>}</Load></>;
}
