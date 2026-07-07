import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError('Sign-in failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-vault-bg p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm">
        <div className="font-display text-2xl text-vault-gold mb-1">Estate Vault</div>
        <p className="text-sm text-vault-muted mb-6">Sign in to your private directory.</p>

        <label className="label">Email</label>
        <input
          className="input mb-3"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="label">Password</label>
        <input
          className="input mb-4"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-vault-danger mb-3">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
