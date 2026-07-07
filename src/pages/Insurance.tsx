import RecordManager, { FieldDef } from '../components/RecordManager';
import { useEncryptedCollection } from '../lib/useEncryptedCollection';
import { InsurancePolicy } from '../lib/types';

const fields: FieldDef[] = [
  { key: 'provider', label: 'Provider', required: true },
  { key: 'policyNumber', label: 'Policy number', required: true },
  { key: 'policyType', label: 'Policy type', placeholder: 'Life / Medical / Motor / Takaful' },
  { key: 'beneficiary', label: 'Beneficiary named on policy' },
  { key: 'agentName', label: 'Agent name' },
  { key: 'agentContact', label: 'Agent contact number' },
  { key: 'premiumDueDate', label: 'Premium due date', type: 'date' }
];

export default function Insurance() {
  const { items, loading, save, remove } = useEncryptedCollection<InsurancePolicy>('insurance');
  return (
    <RecordManager
      title="Insurance & Takaful"
      description="Life, medical, motor and takaful policies, with the agent who can help your family claim."
      fields={fields}
      items={items}
      loading={loading}
      primaryField="provider"
      secondaryField="policyType"
      onSave={save}
      onDelete={remove}
      emptyMessage="No policies added yet. Tap + Add to list your first one."
    />
  );
}
