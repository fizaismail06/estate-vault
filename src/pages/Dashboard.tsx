import { Link } from 'react-router-dom';
import { useEncryptedCollection } from '../lib/useEncryptedCollection';
import { BankAccount, Investment, InsurancePolicy, TrustedContact } from '../lib/types';

export default function Dashboard() {
  const accounts = useEncryptedCollection<BankAccount>('accounts');
  const investments = useEncryptedCollection<Investment>('investments');
  const insurance = useEncryptedCollection<InsurancePolicy>('insurance');
  const contacts = useEncryptedCollection<TrustedContact>('trustedContacts');

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
            A sealed copy is held with your lawyer. See{' '}
            <Link to="/settings" className="text-vault-gold underline">
              Settings & Export
            </Link>{' '}
            for the latest export and the guide note for your executor.
          </li>
        </ul>
      </div>
    </div>
  );
}
