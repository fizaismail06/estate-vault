import RecordManager, { FieldDef } from '../components/RecordManager';
import { useEncryptedCollection } from '../lib/useEncryptedCollection';
import { Investment } from '../lib/types';

const fields: FieldDef[] = [
  { key: 'type', label: 'Type', required: true, placeholder: 'Unit trust / ASB / Gold / Shares / EPF' },
  { key: 'institution', label: 'Institution / platform', required: true },
  { key: 'accountNumber', label: 'Account / folio number' },
  { key: 'approxValue', label: 'Approximate value' },
  { key: 'lastUpdated', label: 'Value last updated', type: 'date' },
  { key: 'agentContact', label: 'Agent / contact person' }
];

export default function Investments() {
  const { items, loading, save, remove } = useEncryptedCollection<Investment>('investments');
  return (
    <RecordManager
      title="Investments"
      description="Unit trusts, gold savings, shares, EPF and other holdings — a directory, not a live tracker."
      fields={fields}
      items={items}
      loading={loading}
      primaryField="institution"
      secondaryField="type"
      onSave={save}
      onDelete={remove}
      emptyMessage="No investments added yet. Tap + Add to list your first one."
    />
  );
}
