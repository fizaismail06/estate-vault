import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function VaultUnlock() {
  const { unlockVault, logout } = useAuth();
  const [mp, setMp] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setChecking(true);
    try {
      const ok = await unlockVault(mp);
      if (!ok) setError('Incorrect Master Password.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-vault-bg p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm">
        <div className="font-display text-2xl text-vault-gold mb-1">Unlock Estate Vault</div>
        <p className="text-sm text-vault-muted mb-5">
          Enter your Master Password to decrypt your entries for this session.
        </p>
        <label className="label">Master Password</label>
        <input
          className="input mb-4"
          type="password"
          autoFocus
          required
          value={mp}
          onChange={(e) => setMp(e.target.value)}
        />
        {error && <p className="text-sm text-vault-danger mb-3">{error}</p>}
        <button type="submit" disabled={checking} className="btn-primary w-full mb-2">
          {checking ? 'Checking…' : 'Unlock'}
        </button>
        <button type="button" onClick={logout} className="text-sm text-vault-muted w-full text-center hover:text-vault-text">
          Sign out
        </button>
      </form>
    </div>
  );
}
