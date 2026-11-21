import { Load } from '../admin/shared.jsx';
import { displayDate } from './dates.js';

export default function Profile() {
  return <><h1 className="text-4xl font-semibold">My profile</h1>
    <Load path="/member/profile">{({member}) => <dl className="profile">
      {[['Full name',member.fullName],['Father’s name',member.fatherName],['Mobile',member.mobile],['Address',member.address],['Joining date',displayDate(member.joiningDate)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>}</Load><p>Contact the gym owner to update your details.</p></>;
}
