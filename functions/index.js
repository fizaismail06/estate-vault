const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

const COLLECTIONS = ['accounts', 'investments', 'insurance', 'trustedContacts', 'documents', 'wasiat'];

// firebase functions:secrets:set SMTP_USER
// firebase functions:secrets:set SMTP_PASS
const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');

const LABELS = {
  accounts: 'Bank Accounts',
  investments: 'Investments',
  insurance: 'Insurance & Takaful',
  trustedContacts: 'Trusted Contacts',
  documents: 'Documents Locator',
  wasiat: 'Wasiat Notes'
};

/**
 * Builds ONE self-contained HTML file. It embeds the (still-encrypted) data
 * and the decryption logic inline, using the same PBKDF2 -> AES-GCM scheme
 * as the app (see src/lib/crypto.ts). Opening this file in any browser --
 * with no internet connection, no sign-in, no visiting the live app -- shows
 * a single Master Password box. This is the file that gets emailed directly
 * to next-of-kin; this Cloud Function never has the Master Password itself,
 * so it cannot read any of the data it is bundling.
 */
async function buildSelfContainedFile(uid, userData) {
  const records = {};
  for (const col of COLLECTIONS) {
    const snap = await db.collection('users').doc(uid).collection(col).get();
    records[col] = snap.docs.map((d) => ({ id: d.id, payload: d.data().payload }));
  }
  const bundle = { salt: userData.salt, records };
  const bundleJson = JSON.stringify(bundle).replace(/</g, '\\u003c');
  const labelsJson = JSON.stringify(LABELS);
  const generatedAt = new Date().toISOString();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Estate Vault — Sealed Backup</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; background:#0f1115; color:#e8eaed; margin:0; padding:24px; }
  .wrap { max-width:640px; margin:0 auto; }
  h1 { font-size:22px; color:#c9a24b; margin-bottom:4px; }
  p.sub { color:#8a92a3; font-size:14px; margin-top:0; }
  .card { background:#161a21; border:1px solid #262c37; border-radius:12px; padding:16px; margin-bottom:16px; }
  input { width:100%; box-sizing:border-box; background:#1d222b; border:1px solid #262c37; color:#e8eaed;
          border-radius:8px; padding:10px 12px; font-size:15px; margin-bottom:12px; }
  button { background:#c9a24b; color:#0f1115; border:none; border-radius:8px; padding:10px 16px;
           font-size:15px; font-weight:600; cursor:pointer; width:100%; }
  button:hover { background:#8a7135; }
  .error { color:#c1554a; font-size:14px; margin-bottom:10px; }
  .field { display:flex; gap:8px; font-size:14px; margin-bottom:4px; }
  .field .k { color:#8a92a3; min-width:120px; }
  .rowitem { background:#1d222b; border-radius:8px; padding:10px; margin-bottom:8px; }
  h2 { font-size:16px; margin:0 0 10px 0; }
  .muted { color:#8a92a3; font-size:12px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Estate Vault — Sealed Backup</h1>
  <p class="sub">For ${userData.email}. Generated ${generatedAt}.</p>

  <div class="card" id="unlock-card">
    <p style="font-size:14px; margin-top:0;">
      This file was generated because a check-in was missed. Everything below is encrypted —
      enter the Master Password (held by the appointed lawyer or trusted contact) to view it.
      This works fully offline; nothing here is sent anywhere.
    </p>
    <input id="password" type="password" placeholder="Master Password" />
    <div id="error" class="error"></div>
    <button id="unlockBtn">Decrypt</button>
  </div>

  <div id="results"></div>
</div>

<script>
const BUNDLE = ${bundleJson};
const LABELS = ${labelsJson};

function b64ToBuf(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(masterPassword, saltB64) {
  const salt = new Uint8Array(b64ToBuf(saltB64));
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(masterPassword), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

async function decryptPayload(payload, masterPassword, saltB64) {
  const [ivB64, cipherB64] = payload.split('.');
  const key = await deriveKey(masterPassword, saltB64);
  const iv = new Uint8Array(b64ToBuf(ivB64));
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, b64ToBuf(cipherB64));
  return JSON.parse(new TextDecoder().decode(dec));
}

document.getElementById('unlockBtn').addEventListener('click', async () => {
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error');
  const resultsEl = document.getElementById('results');
  errorEl.textContent = '';
  resultsEl.innerHTML = '';

  let anyDecrypted = false;
  const sections = [];

  for (const [collectionName, entries] of Object.entries(BUNDLE.records)) {
    const items = [];
    for (const entry of entries) {
      try {
        const item = await decryptPayload(entry.payload, password, BUNDLE.salt);
        items.push(item);
        anyDecrypted = true;
      } catch (e) { /* wrong password or corrupted entry, skip */ }
    }
    if (items.length > 0) sections.push({ collectionName, items });
  }

  if (!anyDecrypted) {
    errorEl.textContent = 'Incorrect Master Password, or nothing to show.';
    return;
  }

  document.getElementById('unlock-card').style.display = 'none';

  for (const { collectionName, items } of sections) {
    const card = document.createElement('div');
    card.className = 'card';
    const h2 = document.createElement('h2');
    h2.textContent = LABELS[collectionName] || collectionName;
    card.appendChild(h2);
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'rowitem';
      for (const [k, v] of Object.entries(item)) {
        if (k === 'id') continue;
        const field = document.createElement('div');
        field.className = 'field';
        const kEl = document.createElement('span');
        kEl.className = 'k';
        kEl.textContent = k + ':';
        const vEl = document.createElement('span');
        vEl.textContent = String(v);
        field.appendChild(kEl);
        field.appendChild(vEl);
        row.appendChild(field);
      }
      card.appendChild(row);
    }
    resultsEl.appendChild(card);
  }
});
</script>
</body>
</html>`;
}

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() }
  });
}

/** Generates the self-contained file and stores a copy (for the owner's own re-download in Settings). */
async function generateExportOnly(uid) {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) return null;
  const userData = userDoc.data();

  const html = await buildSelfContainedFile(uid, userData);
  const bucket = getStorage().bucket();
  const filePath = `exports/${uid}/${Date.now()}.html`;
  const file = bucket.file(filePath);
  await file.save(Buffer.from(html, 'utf-8'), { contentType: 'text/html' });

  await db.collection('users').doc(uid).update({
    lastExportAt: new Date().toISOString()
  });

  return { html, userData };
}

async function sendReminderToOwner(userEmail) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `Estate Vault <${SMTP_USER.value()}>`,
    to: userEmail,
    subject: 'Estate Vault — please check in',
    text:
      `You have not checked in to Estate Vault recently.\n\n` +
      `Please open the app and tap "I'm okay" to confirm you're fine. ` +
      `If check-ins are missed past the grace period, your next-of-kin will automatically ` +
      `receive a single file they can open directly to view a sealed backup.`
  });
}

/** Emails the self-contained HTML file as a direct attachment — no link, no login, no app visit. */
async function sendExportToContacts(toEmails, userEmail, html) {
  if (!toEmails.length) return;
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `Estate Vault <${SMTP_USER.value()}>`,
    to: toEmails.join(','),
    subject: `Estate Vault — sealed backup for ${userEmail}`,
    text:
      `You are listed as a trusted contact in ${userEmail}'s Estate Vault.\n\n` +
      `${userEmail} has missed their check-in past the grace period, so a sealed backup is ` +
      `attached to this email as a precaution.\n\n` +
      `To view it: save the attached file (estate-vault-backup.html) and open it in any web ` +
      `browser (Chrome, Safari, Edge). It works offline and does not require signing in anywhere. ` +
      `It will ask for a Master Password, which is held separately by the appointed lawyer or ` +
      `another trusted contact.`,
    attachments: [
      {
        filename: 'estate-vault-backup.html',
        content: html,
        contentType: 'text/html'
      }
    ]
  });
}

/**
 * Runs daily. If overdue past checkInIntervalDays and 'active' -> reminder to the OWNER.
 * If overdue past interval + gracePeriodDays and 'reminder_sent' -> the self-contained file
 * is generated and emailed AS AN ATTACHMENT to next-of-kin. Nothing is sent otherwise.
 */
exports.checkDeadManSwitch = onSchedule(
  { schedule: 'every 24 hours', secrets: [SMTP_USER, SMTP_PASS] },
  async () => {
    const usersSnap = await db.collection('users').get();
    const now = Date.now();

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();
      if (!user.lastCheckIn) continue;

      const intervalDays = user.checkInIntervalDays || 30;
      const graceDays = user.gracePeriodDays || 14;
      const daysSince = (now - new Date(user.lastCheckIn).getTime()) / 86400000;
      const status = user.status || 'active';

      try {
        if (daysSince > intervalDays && status === 'active') {
          await sendReminderToOwner(user.email);
          await userDoc.ref.update({ status: 'reminder_sent' });
        } else if (daysSince > intervalDays + graceDays && status === 'reminder_sent') {
          const result = await generateExportOnly(userDoc.id);
          if (result) {
            await sendExportToContacts(user.notifyEmails || [], user.email, result.html);
          }
          await userDoc.ref.update({ status: 'released' });
        }
      } catch (err) {
        console.error(`Dead man's switch failed for ${userDoc.id}:`, err);
      }
    }
  }
);

/** Manual, on-demand export from Settings. Always emails the attachment immediately. */
exports.generateSealedExportNow = onCall(
  { secrets: [SMTP_USER, SMTP_PASS] },
  async (request) => {
    if (!request.auth) throw new Error('Must be signed in.');
    const result = await generateExportOnly(request.auth.uid);
    if (result) {
      await sendExportToContacts(result.userData.notifyEmails || [], result.userData.email, result.html);
    }
    return { sent: !!result };
  }
);
