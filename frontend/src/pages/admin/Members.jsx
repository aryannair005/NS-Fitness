import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heading, Load } from './shared.jsx';

export default function Members() {
  const [query,setQuery] = useState('');
  return <><Heading title="Member directory" add /><label>Search by name, email or mobile
    <input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
    <Load path={'/admin/members?q='+encodeURIComponent(query)}>{({members}) => <section aria-label="Search results">
      {members.map(m => <Link className="row" key={m._id} to={'/admin/members/'+m._id}><span>{m.fullName}<small>{m.email} · {m.mobile}</small></span><span>{m.isActive ? 'Enabled' : 'Deactivated'}</span></Link>)}
      {!members.length && <p>No matching members.</p>}
    </section>}</Load></>;
}

