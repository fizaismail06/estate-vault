import RecordManager, { FieldDef } from '../components/RecordManager';
import { useEncryptedCollection } from '../lib/useEncryptedCollection';
import { TrustedContact } from '../lib/types';

const fields: FieldDef[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'relationship', label: 'Relationship', placeholder: 'Brother / Sister / Lawyer / Agent' },
  { key: 'role', label: 'Role in your estate plan', placeholder: 'Executor / Lawyer / Family to notify' },
  { key: 'phone', label: 'Phone number' },
  { key: 'email', label: 'Email' }
];

export default function Contacts() {
  const { items, loading, save, remove } = useEncryptedCollection<TrustedContact>('trustedContacts');
  return (
    <RecordManager
      title="Trusted Contacts"
      description="People your family should call: executor, lawyer, close family, financial agents."
      fields={fields}
      items={items}
      loading={loading}
      primaryField="name"
      secondaryField="role"
      onSave={save}
      onDelete={remove}
      emptyMessage="No contacts added yet. Start with your lawyer and your executor."
    />
  );
}
