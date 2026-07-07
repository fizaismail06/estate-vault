const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const PDFDocument = require('pdfkit');
const { getStorage } = require('firebase-admin/storage');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

const COLLECTIONS = ['accounts', 'investments', 'insurance', 'trustedContacts', 'documents', 'wasiat'];

// firebase functions:secrets:set SMTP_USER
// firebase functions:secrets:set SMTP_PASS
const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');

/** Builds a sealed PDF containing only ciphertext + a plain-language cover page. */
async function buildSealedExportForUser(uid, userData) {
  const bundle = {};
  for (const col of COLLECTIONS) {
    const snap = await db.collection('users').doc(uid).collection(col).get();
    bundle[col] = snap.docs.map((d) => ({ id: d.id, payload: d.data().payload }));
  }

  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));

  doc.fontSize(18).text('Estate Vault — Sealed Export', { align: 'left' });
  doc.moveDown();
  doc.fontSize(11).text(
    `This document contains an encrypted backup of estate information for ${userData.email}. ` +
      `The data below is encrypted and cannot be read without the Master Password, which is held ` +
      `separately (see the appointed lawyer or trusted contact).`
  );
  doc.moveDown();
  doc.fontSize(10).fillColor('gray').text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown(2);
  doc.fillColor('black').fontSize(9).font('Courier').text(JSON.stringify(bundle, null, 2), { width: 500 });
  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() }
  });
}

/** Generates (and stores) a sealed export. Does NOT email anyone — call sites decide that. */
async function generateExportOnly(uid) {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) return null;
  const userData = userDoc.data();

  const pdfBuffer = await buildSealedExportForUser(uid, userData);
  const bucket = getStorage().bucket();
  const filePath = `exports/${uid}/${Date.now()}.pdf`;
  const file = bucket.file(filePath);
  await file.save(pdfBuffer, { contentType: 'application/pdf' });

  const [exportUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 365
  });

  await db.collection('users').doc(uid).update({
    lastExportAt: new Date().toISOString(),
    lastExportUrl: exportUrl
  });

  return { exportUrl, userData };
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
      `If check-ins are missed past the grace period, a sealed backup will automatically be ` +
      `emailed to your listed next-of-kin contacts.`
  });
}

async function sendExportToContacts(toEmails, userEmail, exportUrl) {
  if (!toEmails.length) return;
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `Estate Vault <${SMTP_USER.value()}>`,
    to: toEmails.join(','),
    subject: `Estate Vault — sealed backup for ${userEmail}`,
    text:
      `You are listed as a trusted contact in ${userEmail}'s Estate Vault.\n\n` +
      `${userEmail} has missed their check-in past the grace period, so a sealed, encrypted ` +
      `backup is being shared with you as a precaution:\n${exportUrl}\n\n` +
      `This file is encrypted and cannot be opened without the Master Password, which is held ` +
      `separately by their appointed lawyer or another trusted contact.`
  });
}

/**
 * Runs daily. For each user:
 *  - if overdue past checkInIntervalDays and still 'active' -> email the OWNER a reminder
 *  - if overdue past checkInIntervalDays + gracePeriodDays and 'reminder_sent' -> generate
 *    export and email the next-of-kin contacts, mark 'released'
 * Nothing is emailed to next-of-kin unless a check-in is actually missed past the grace period.
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
      const lastCheckInMs = new Date(user.lastCheckIn).getTime();
      const daysSince = (now - lastCheckInMs) / 86400000;
      const status = user.status || 'active';

      try {
        if (daysSince > intervalDays && status === 'active') {
          await sendReminderToOwner(user.email);
          await userDoc.ref.update({ status: 'reminder_sent' });
        } else if (daysSince > intervalDays + graceDays && status === 'reminder_sent') {
          const result = await generateExportOnly(userDoc.id);
          if (result) {
            await sendExportToContacts(user.notifyEmails || [], user.email, result.exportUrl);
          }
          await userDoc.ref.update({ status: 'released' });
        }
      } catch (err) {
        console.error(`Dead man's switch failed for ${userDoc.id}:`, err);
      }
    }
  }
);

/** Manual, on-demand export from Settings. User explicitly asked for this — always emails now. */
exports.generateSealedExportNow = onCall(
  { secrets: [SMTP_USER, SMTP_PASS] },
  async (request) => {
    if (!request.auth) throw new Error('Must be signed in.');
    const result = await generateExportOnly(request.auth.uid);
    if (result) {
      await sendExportToContacts(result.userData.notifyEmails || [], result.userData.email, result.exportUrl);
    }
    return { exportUrl: result?.exportUrl };
  }
);
