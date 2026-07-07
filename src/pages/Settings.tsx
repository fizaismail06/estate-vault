import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  async function triggerExport() {
    setExporting(true);
    setExportMsg('');
    try {
      const functions = getFunctions(app);
      const generate = httpsCallable(functions, 'generateSealedExportNow');
      const result: any = await generate();
      setExportMsg(`Export ready: ${result.data.exportUrl}`);
    } catch (err) {
      setExportMsg('Could not generate export right now. It will still run on the weekly schedule.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <h1 className="section-title mb-1">Settings & Export</h1>
      <p className="text-sm text-vault-muted mb-6">
        Signed in as {user?.email}
      </p>

      <div className="card mb-4">
        <h2 className="font-display text-lg mb-2">Sealed export</h2>
        <p className="text-sm text-vault-muted mb-3">
          A weekly encrypted PDF is generated automatically as a fallback in case this app or your
          Google account is ever inaccessible. Your family can also request an on-demand copy.
        </p>
        <button onClick={triggerExport} disabled={exporting} className="btn-secondary">
          {exporting ? 'Generating…' : 'Generate export now'}
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
