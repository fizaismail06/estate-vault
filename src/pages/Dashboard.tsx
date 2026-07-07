import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useEncryptedCollection } from '../lib/useEncryptedCollection';
import { BankAccount, Investment, InsurancePolicy, TrustedContact } from '../lib/types';

export default function Dashboard() {
  const { user } = useAuth();
  const accounts = useEncryptedCollection<BankAccount>('accounts');
  const investments = useEncryptedCollection<Investment>('investments');
  const insurance = useEncryptedCollection<InsurancePolicy>('insurance');
  const contacts = useEncryptedCollection<TrustedContact>('trustedContacts');

  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  const [intervalDays, setIntervalDays] = useState(30);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setLastCheckIn(snap.data().lastCheckIn || null);
        setIntervalDays(snap.data().checkInIntervalDays || 30);
      }
    })();
  }, [user]);

  async function checkIn() {
    if (!user) return;
    setCheckingIn(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'users', user.uid), {
        lastCheckIn: now,
        status: 'active'
      });
      setLastCheckIn(now);
    } finally {
      setCheckingIn(false);
    }
  }

  const daysSince = lastCheckIn
    ? Math.floor((Date.now() - new Date(lastCheckIn).getTime()) / 86400000)
    : null;
  const isOverdue = daysSince !== null && daysSince > intervalDays;

  const cards = [
    { label: 'Bank Accounts', count: accounts.items.length, to: '/accounts' },
    { label: 'Investments', count: investments.items.length, to: '/investments' },
    { label: 'Insurance & Takaful', count: insurance.items.length, to: '/insurance' },
    { label: 'Trusted Contacts', count: contacts.items.length, to: '/contacts' }
  ];

  return (
    <div>
      <h1 className="section-title mb-1">Estate Vault</h1>
      <p className="text-sm text-vault-muted mb-6">
        A private directory of your accounts, investments and insurance — so your family isn't
        left guessing.
      </p>

      <div className={`card mb-6 ${isOverdue ? 'border-vault-danger' : ''}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-display text-lg mb-1">Check-in status</h2>
            {daysSince === null ? (
              <p className="text-sm text-vault-muted">You haven't checked in yet.</p>
            ) : (
              <p className={`text-sm ${isOverdue ? 'text-vault-danger' : 'text-vault-muted'}`}>
                Last checked in {daysSince} day{daysSince === 1 ? '' : 's'} ago
                {isOverdue && ' — overdue'}
              </p>
            )}
            <p className="text-xs text-vault-muted mt-1">
              Check in every {intervalDays} days. Your next-of-kin only get a copy of your sealed
              export if you miss a check-in past the grace period — not on any regular schedule.
            </p>
          </div>
          <button onClick={checkIn} disabled={checkingIn} className="btn-primary shrink-0">
            {checkingIn ? 'Checking in…' : "I'm okay ✓"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="card hover:border-vault-gold/50 transition-colors">
            <div className="text-2xl font-display text-vault-gold">{c.count}</div>
            <div className="text-sm text-vault-muted mt-1">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="card">
        <h2 className="font-display text-lg mb-2">How access works</h2>
        <ul className="text-sm text-vault-muted space-y-2 list-disc pl-4">
          <li>Everything you enter is encrypted in your browser before it's ever saved.</li>
          <li>Your Master Password is never stored in this app — only you know it.</li>
          <li>
            A sealed copy is held with your lawyer. Next-of-kin only receive an emailed copy
            automatically if you miss check-ins — see{' '}
            <Link to="/settings" className="text-vault-gold underline">
              Settings & Export
            </Link>{' '}
            to adjust the check-in interval or add contacts.
          </li>
        </ul>
      </div>
    </div>
  );
}
