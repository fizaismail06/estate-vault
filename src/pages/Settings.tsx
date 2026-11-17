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
  const [intervalDays, setIntervalDays] = useState(30);
  const [graceDays, setGraceDays] = useState(14);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setNotifyEmails(snap.data().notifyEmails || []);
        setLastExportAt(snap.data().lastExportAt || null);
        setIntervalDays(snap.data().checkInIntervalDays || 30);
        setGraceDays(snap.data().gracePeriodDays || 14);
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

  async function saveSchedule() {
    if (!user) return;
    setSavingSchedule(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        checkInIntervalDays: intervalDays,
        gracePeriodDays: graceDays
      });
    } finally {
      setSavingSchedule(false);
    }
  }

  async function triggerExport() {
    setExporting(true);
    setExportMsg('');
    try {
      const functions = getFunctions(app);
      const generate = httpsCallable(functions, 'generateSealedExportNow');
      await generate();
      setExportMsg(
        notifyEmails.length
          ? `Export generated and emailed now to: ${notifyEmails.join(', ')}`
          : 'Export generated. Add an email below to actually send a copy.'
      );
      setLastExportAt(new Date().toISOString());
    } catch (err: any) {
      if (err?.code === 'functions/resource-exhausted') {
        setExportMsg('Please wait a few minutes before sending another export.');
      } else if (err?.code === 'functions/permission-denied') {
        setExportMsg('This account is not allowed to send exports.');
      } else {
        setExportMsg('Could not generate export right now.');
      }
    } finally {
      setExporting(false);
    }
  }

  async function downloadBackup() {
    setDownloading(true);
    setDownloadMsg('');
    try {
      const functions = getFunctions(app);
      const fetchBackup = httpsCallable<unknown, { filename: string; html: string }>(
        functions,
        'downloadBackup'
      );
      const { data } = await fetchBackup();
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloadMsg(`Saved ${data.filename}. Open it in a browser and enter the Master Password to check it.`);
    } catch (err: any) {
      if (err?.code === 'functions/permission-denied') {
        setDownloadMsg('This account is not allowed to download backups.');
      } else {
        setDownloadMsg('Could not download the backup right now.');
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <h1 className="section-title mb-1">Settings & Export</h1>
      <p className="text-sm text-vault-muted mb-6">Signed in as {user?.email}</p>

      <div className="card mb-4">
        <h2 className="font-display text-lg mb-2">Check-in schedule</h2>
        <p className="text-sm text-vault-muted mb-3">
          If you don't check in (Dashboard → "I'm okay") within the interval below, you'll get a
          reminder email. If you still haven't checked in after the grace period on top of that,
          your next-of-kin will automatically be emailed the sealed export — and only then.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Check-in every (days)</label>
            <input
              className="input"
              type="number"
              min={1}
              value={intervalDays}
              onChange={(e) => setIntervalDays(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Grace period after that (days)</label>
            <input
              className="input"
              type="number"
              min={1}
              value={graceDays}
              onChange={(e) => setGraceDays(Number(e.target.value))}
            />
          </div>
        </div>
        <button onClick={saveSchedule} disabled={savingSchedule} className="btn-secondary">
          {savingSchedule ? 'Saving…' : 'Save schedule'}
        </button>
      </div>

      <div className="card mb-4">
        <h2 className="font-display text-lg mb-2">Notify by email (next of kin)</h2>
        <p className="text-sm text-vault-muted mb-3">
          These addresses only receive the sealed export automatically if you miss a check-in
          past the grace period above. They will not receive anything on a regular schedule.
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
        <h2 className="font-display text-lg mb-2">Manual export</h2>
        <p className="text-sm text-vault-muted mb-1">
          Sends your next-of-kin a single file right now, as an email attachment — the same file
          they'd get automatically if you missed a check-in. They open it in any browser, type the
          Master Password, and see everything. No sign-in, no visiting this app.
        </p>
        {lastExportAt && (
          <p className="text-xs text-vault-muted mb-3">
            Last export: {new Date(lastExportAt).toLocaleString()}
          </p>
        )}
        <button onClick={triggerExport} disabled={exporting} className="btn-secondary">
          {exporting ? 'Generating…' : 'Generate & send now'}
        </button>
        {exportMsg && <p className="text-sm text-vault-muted mt-3">{exportMsg}</p>}
      </div>

      <div className="card mb-4">
        <h2 className="font-display text-lg mb-2">Download backup</h2>
        <p className="text-sm text-vault-muted mb-3">
          Saves a fresh copy of the backup file to this device, without emailing anyone. It's the
          same file your next-of-kin would receive: still encrypted, and opened with the Master
          Password. Good for a copy to keep with your lawyer.
        </p>
        <button onClick={downloadBackup} disabled={downloading} className="btn-secondary">
          {downloading ? 'Preparing…' : 'Download backup (.html)'}
        </button>
        {downloadMsg && <p className="text-sm text-vault-muted mt-3">{downloadMsg}</p>}
      </div>

      <div className="card mb-4">
        <h2 className="font-display text-lg mb-2">Lawyer custody checklist</h2>
        <ul className="text-sm text-vault-muted space-y-2 list-disc pl-4">
          <li>Master Password written down and sealed, held by your appointed lawyer.</li>
          <li>Lawyer instructed on when it may be released (e.g. upon proof of death / probate).</li>
          <li>Wasiat references "digital estate access" held with the lawyer.</li>
          <li>Executor and family know the lawyer's contact details — see Trusted Contacts.</li>
          <li>Check-in schedule above reflects how often you'll realistically use this app.</li>
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
