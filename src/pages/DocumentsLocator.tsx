import RecordManager, { FieldDef } from '../components/RecordManager';
import { useEncryptedCollection } from '../lib/useEncryptedCollection';
import { DocumentLocation } from '../lib/types';

const fields: FieldDef[] = [
  { key: 'documentName', label: 'Document', required: true, placeholder: 'e.g. Original Will' },
  { key: 'location', label: 'Where to find it', required: true, placeholder: 'e.g. Safe deposit box, Bank X, Branch Y' },
  { key: 'notes', label: 'Notes', type: 'textarea' }
];

export default function DocumentsLocator() {
  const { items, loading, save, remove } = useEncryptedCollection<DocumentLocation>('documents');
  return (
    <RecordManager
      title="Documents Locator"
      description="Where the physical, legal documents are — not the documents themselves."
      fields={fields}
      items={items}
      loading={loading}
      primaryField="documentName"
      secondaryField="location"
      onSave={save}
      onDelete={remove}
      emptyMessage="No document locations added yet. Start with your will and property deeds."
    />
  );
}
