import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function VaultSetup() {
  const { setupVault } = useAuth();
  const [mp, setMp] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (mp.length < 12) {
      setError('Use at least 12 characters — this protects everything in the vault.');
      return;
    }
    if (mp !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!confirmed) {
      setError('Please confirm you understand this password cannot be recovered by the app.');
      return;
    }
    setSaving(true);
    try {
      await setupVault(mp);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-vault-bg p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-md">
        <div className="font-display text-2xl text-vault-gold mb-1">Set your Master Password</div>
        <p className="text-sm text-vault-muted mb-5">
          This password encrypts everything you store here. It is never sent to Firebase or
          stored anywhere in this app — only you (and whoever you choose, e.g. your lawyer) will
          hold it.
        </p>

        <label className="label">Master Password</label>
        <input
          className="input mb-3"
          type="password"
          required
          value={mp}
          onChange={(e) => setMp(e.target.value)}
        />
        <label className="label">Confirm Master Password</label>
        <input
          className="input mb-4"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <label className="flex items-start gap-2 text-sm text-vault-muted mb-4">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1"
          />
          I understand that if this password is lost, the app cannot recover it. I have arranged
          a copy to be kept safely (e.g. with my lawyer).
        </label>

        {error && <p className="text-sm text-vault-danger mb-3">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Setting up…' : 'Create vault'}
        </button>
      </form>
    </div>
  );
}
