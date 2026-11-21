import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordField({ label, ...inputProps }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return <div>
    <label htmlFor={id}>{label}</label>
    <div className="member-password">
      <input {...inputProps} id={id} type={visible ? 'text' : 'password'} />
      <button type="button" aria-controls={id} aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(value => !value)}>
        {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
    </div>
  </div>;
}
