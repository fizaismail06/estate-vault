import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { app, db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [notifyEmails, setNotifyEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmails, setSavingEmails] = useState(false);
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setNotifyEmails(snap.data().notifyEmails || []);
        setLastExportAt(snap.data().lastExportAt || null);
      }
    })();
  }, [user]);

  async function saveEmails(updated: string[]) {
    if (!user) return;
    setSavingEmails(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { notifyEmails: updated });
      setNotifyEmails(updated);
    } finally {
      setSavingEmails(false);
    }
  }

  function addEmail() {
    const trimmed = newEmail.trim();
    if (!trimmed || notifyEmails.includes(trimmed)) return;
    saveEmails([...notifyEmails, trimmed]);
    setNewEmail('');
  }

  function removeEmail(email: string) {
    saveEmails(notifyEmails.filter((e) => e !== email));
  }

  async function triggerExport() {
    setExporting(true);
    setExportMsg('');
    try {
      const functions = getFunctions(app);
      const generate = httpsCallable(functions, 'generateSealedExportNow');
      const result: any = await generate();
      setExportMsg(
        notifyEmails.length
          ? `Export generated and emailed to: ${notifyEmails.join(', ')}`
          : 'Export generated. Add at least one email below so a copy gets sent automatically.'
      );
      setLastExportAt(new Date().toISOString());
      void result;
    } catch (err) {
      setExportMsg('Could not generate export right now. It will still run on the weekly schedule.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <h1 className="section-title mb-1">Settings & Export</h1>
      <p className="text-sm text-vault-muted mb-6">Signed in as {user?.email}</p>

      <div className="card mb-4">
        <h2 className="font-display text-lg mb-2">Notify by email</h2>
        <p className="text-sm text-vault-muted mb-3">
          Add the email address(es) of your next of kin, executor, or lawyer. Every time a sealed
          export is generated (weekly, or on demand below), they'll each get an email with a link
          to the encrypted backup PDF. The file is still fully encrypted — this just makes sure a
          copy reaches them without you having to do anything.
        </p>

        {notifyEmails.length > 0 && (
          <ul className="space-y-2 mb-3">
            {notifyEmails.map((email) => (
              <li key={email} className="flex items-center justify-between text-sm bg-vault-surfaceAlt rounded-lg px-3 py-2">
                <span>{email}</span>
                <button onClick={() => removeEmail(email)} className="btn-danger text-xs">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            className="input"
            type="email"
            placeholder="e.g. abang@email.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEmail()}
          />
          <button onClick={addEmail} disabled={savingEmails} className="btn-secondary shrink-0">
            Add
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <h2 className="font-display text-lg mb-2">Sealed export</h2>
        <p className="text-sm text-vault-muted mb-1">
          A weekly encrypted PDF is generated automatically and emailed to everyone listed above.
        </p>
        {lastExportAt && (
          <p className="text-xs text-vault-muted mb-3">
            Last export: {new Date(lastExportAt).toLocaleString()}
          </p>
        )}
        <button onClick={triggerExport} disabled={exporting} className="btn-secondary">
          {exporting ? 'Generating…' : 'Generate & send export now'}
        </button>
        {exportMsg && <p className="text-sm text-vault-muted mt-3">{exportMsg}</p>}
      </div>

      <div className="card mb-4">
        <h2 className="font-display text-lg mb-2">Lawyer custody checklist</h2>
        <ul className="text-sm text-vault-muted space-y-2 list-disc pl-4">
          <li>Master Password written down and sealed, held by your appointed lawyer.</li>
          <li>Lawyer instructed on when it may be released (e.g. upon proof of death / probate).</li>
          <li>Wasiat references "digital estate access" held with the lawyer.</li>
          <li>Executor and family know the lawyer's contact details — see Trusted Contacts.</li>
          <li>Next-of-kin emails added above so they automatically receive the sealed backup.</li>
        </ul>
      </div>

      <div className="card">
        <h2 className="font-display text-lg mb-2">Account</h2>
        <button onClick={logout} className="btn-danger text-sm">
          Sign out
        </button>
      </div>
    </div>
  );
}