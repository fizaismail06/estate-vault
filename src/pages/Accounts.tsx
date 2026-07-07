import RecordManager, { FieldDef } from '../components/RecordManager';
import { useEncryptedCollection } from '../lib/useEncryptedCollection';
import { BankAccount } from '../lib/types';

const fields: FieldDef[] = [
  { key: 'bankName', label: 'Bank name', required: true, placeholder: 'e.g. Maybank' },
  { key: 'accountNumber', label: 'Account number', required: true },
  { key: 'accountType', label: 'Account type', placeholder: 'Savings / Current / Joint' },
  { key: 'branch', label: 'Branch' },
  { key: 'nominee', label: 'Nominee / beneficiary on account' },
  { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'e.g. joint account with Abang' }
];

export default function Accounts() {
  const { items, loading, save, remove } = useEncryptedCollection<BankAccount>('accounts');
  return (
    <RecordManager
      title="Bank Accounts"
      description="Every bank account your family or executor should know about."
      fields={fields}
      items={items}
      loading={loading}
      primaryField="bankName"
      secondaryField="accountNumber"
      onSave={save}
      onDelete={remove}
      emptyMessage="No accounts added yet. Tap + Add to list your first one."
    />
  );
}
