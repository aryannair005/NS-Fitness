import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
export const message = error => error.response?.data?.message || 'Could not reach the gym portal. Please try again.';

export function Load({ path, children }) {
  const [result, setResult] = useState({});
  const [attempt, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.get(path, { signal: controller.signal }).then(({ data }) => setResult({ path, data }))
      .catch(error => { if (!controller.signal.aborted) setResult({ path, error: message(error) }); });
    return () => controller.abort();
  }, [path, attempt]);
  if (result.path !== path) return <p role="status">Loading…</p>;
  if (result.error) return <div role="alert">{result.error} <button onClick={() => { setResult({}); retry(attempt + 1); }}>Retry</button></div>;
  return children(result.data);
}

export function Heading({ title, add }) {
  return <div className="section-heading"><h1>{title}</h1>{add && <Link className="action" to="/admin/members/new">Add member</Link>}</div>;
}

