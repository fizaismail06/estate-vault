const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const PDFDocument = require('pdfkit');
const { getStorage } = require('firebase-admin/storage');

admin.initializeApp();
const db = admin.firestore();

const COLLECTIONS = ['accounts', 'investments', 'insurance', 'trustedContacts', 'documents', 'wasiat'];

/**
 * Builds a sealed PDF for one user. The PDF contains:
 *  - A plain-language cover page (who this belongs to, who to contact)
 *  - The still-encrypted ciphertext bundle for every record, as a JSON block
 *
 * This function NEVER has access to the Master Password. It only ever
 * touches ciphertext that was already encrypted client-side, so the export
 * itself is exactly as safe as Firestore — a sealed backup, not a leak risk.
 */
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
      `separately (see your appointed lawyer or trusted contact). Do not discard this file — it is ` +
      `the fallback copy if the Estate Vault app is ever unavailable.`
  );
  doc.moveDown();
  doc.fontSize(10).fillColor('gray').text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown(2);

  doc.fillColor('black').fontSize(9).font('Courier').text(JSON.stringify(bundle, null, 2), {
    width: 500
  });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function generateForUser(uid) {
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
    expires: Date.now() + 1000 * 60 * 60 * 24 * 365 // 1 year
  });

  await db.collection('users').doc(uid).update({
    lastExportAt: new Date().toISOString(),
    lastExportUrl: exportUrl
  });

  return exportUrl;
}

// Runs weekly for every user in the system
exports.generateSealedExport = onSchedule('every 168 hours', async () => {
  const usersSnap = await db.collection('users').get();
  for (const userDoc of usersSnap.docs) {
    try {
      await generateForUser(userDoc.id);
    } catch (err) {
      console.error(`Export failed for ${userDoc.id}:`, err);
    }
  }
});

// Callable from the Settings page for an on-demand export
exports.generateSealedExportNow = onCall(async (request) => {
  if (!request.auth) {
    throw new Error('Must be signed in.');
  }
  const exportUrl = await generateForUser(request.auth.uid);
  return { exportUrl };
});
