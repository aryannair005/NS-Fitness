import { planLabels } from './planLabels.js';
import { useState } from 'react';
import PasswordField from '../../components/PasswordField.jsx';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { Heading, message } from './shared.jsx';

const fields = [['fullName','Full name','text'],['fatherName',"Father’s name",'text'],['mobile','Login phone number','tel'],['address','Address','text'],['joiningDate','Joining date','date']];
export default function MemberForm({ member }) {
  const navigate = useNavigate();
  const [error,setError] = useState('');
  const today = new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'});
  const {register, handleSubmit, formState:{isSubmitting}} = useForm({
    defaultValues: member ? {...member, joiningDate:member.joiningDate.slice(0,10)} : {joiningDate:today,startDate:today,plan:'Monthly'}
  });
  async function submit(values) {
    setError('');
    try {
      const {data} = member ? await api.put('/admin/members/'+member._id,values) : await api.post('/admin/members',values);
      navigate('/admin/members/'+data.member._id, {state:{notice:member ? 'Member details saved.' : 'Member account created.'}});
    } catch (e) { setError(message(e)); }
  }
  return <><Heading title={member ? 'Edit member' : 'Add member'} /><form onSubmit={handleSubmit(submit)}>
    <fieldset><legend>Personal details</legend><div className="field-grid">{fields.map(([key,label,type]) => <label key={key}>{label}<input required type={type} {...register(key)} /></label>)}</div></fieldset>
    {!member && <><fieldset><legend>Member login</legend>
      <PasswordField label="Initial password" required minLength={12} autoComplete="new-password" {...register('password')} />
      <small>Use at least 12 characters. Give these login details to the member.</small></fieldset>
      <fieldset><legend>Initial membership</legend><div className="field-grid"><label>Plan<select {...register('plan')}>{Object.entries(planLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Fee (₹)<input type="number" required min="0" step=".01" {...register('amount',{valueAsNumber:true})}/></label>
      <label>Start date<input required type="date" {...register('startDate')} /></label><label>End date<input required type="date" {...register('endDate')} /></label></div></fieldset></>}
    {error && <p role="alert">{error}</p>}<div className="controls"><button disabled={isSubmitting}>{isSubmitting ? 'Saving…' : member ? 'Save changes' : 'Create member'}</button>
    <Link to={member ? '/admin/members/'+member._id : '/admin/members'}>Cancel</Link></div></form></>;
}

