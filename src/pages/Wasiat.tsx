import RecordManager, { FieldDef } from '../components/RecordManager';
import { useEncryptedCollection } from '../lib/useEncryptedCollection';
import { WasiatNote } from '../lib/types';

const fields: FieldDef[] = [
  { key: 'title', label: 'Title', required: true, placeholder: 'e.g. Executor instructions' },
  { key: 'content', label: 'Notes', type: 'textarea', required: true }
];

export default function Wasiat() {
  const { items, loading, save, remove } = useEncryptedCollection<WasiatNote>('wasiat');
  return (
    <RecordManager
      title="Wasiat Notes"
      description="Notes on your wasiat, executor instructions, or outstanding zakat obligations. This does not replace your registered will or wasiat — it's a companion reference."
      fields={fields}
      items={items}
      loading={loading}
      primaryField="title"
      secondaryField="content"
      onSave={save}
      onDelete={remove}
      emptyMessage="No notes yet."
    />
  );
}
