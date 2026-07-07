import { useState } from 'react';

export interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'textarea' | 'date';
  required?: boolean;
}

interface RecordManagerProps<T extends Record<string, any>> {
  title: string;
  description: string;
  fields: FieldDef[];
  items: T[];
  loading: boolean;
  primaryField: string; // which field to show as the card title
  secondaryField?: string; // which field to show as subtitle
  onSave: (item: T) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  emptyMessage: string;
}

export default function RecordManager<T extends { id: string } & Record<string, any>>({
  title,
  description,
  fields,
  items,
  loading,
  primaryField,
  secondaryField,
  onSave,
  onDelete,
  emptyMessage
}: RecordManagerProps<T>) {
  const [editing, setEditing] = useState<T | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  function openNew() {
    const blank: any = { id: crypto.randomUUID() };
    fields.forEach((f) => (blank[f.key] = ''));
    setEditing(blank);
    setShowForm(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await onSave(editing);
      setShowForm(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="section-title">{title}</h1>
        <button onClick={openNew} className="btn-primary text-sm">
          + Add
        </button>
      </div>
      <p className="text-sm text-vault-muted mb-6">{description}</p>

      {loading ? (
        <p className="text-vault-muted text-sm">Decrypting…</p>
      ) : items.length === 0 ? (
        <div className="card text-center text-vault-muted text-sm py-10">{emptyMessage}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-vault-text font-medium truncate">{item[primaryField] || '—'}</div>
                {secondaryField && (
                  <div className="text-sm text-vault-muted truncate">{item[secondaryField]}</div>
                )}
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => openEdit(item)} className="text-sm text-vault-muted hover:text-vault-gold">
                  Edit
                </button>
                <button onClick={() => onDelete(item.id)} className="text-sm btn-danger">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-vault-surface border border-vault-border rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-5 max-h-[85vh] overflow-y-auto"
          >
            <h2 className="font-display text-lg mb-4">
              {items.some((i) => i.id === editing.id) ? 'Edit entry' : 'New entry'}
            </h2>
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea
                      className="input"
                      rows={3}
                      placeholder={f.placeholder}
                      required={f.required}
                      value={editing[f.key] ?? ''}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                    />
                  ) : (
                    <input
                      className="input"
                      type={f.type === 'date' ? 'date' : 'text'}
                      placeholder={f.placeholder}
                      required={f.required}
                      value={editing[f.key] ?? ''}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
