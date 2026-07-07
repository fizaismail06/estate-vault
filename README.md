# Estate Vault — Setup Guide

React + TypeScript + Firebase, following the same stack and interface language as
Account Registry: dark theme, client-side AES encryption, PWA-installable.

## 1. Create the Firebase project

```
firebase projects:create estate-vault-xxxxx
```

Enable in the Firebase Console:
- **Authentication** → Email/Password (or add Google Sign-In if you prefer)
- **Firestore** → production mode
- **Storage** → for sealed export PDFs
- **Functions** → for the scheduled/on-demand export (requires Blaze plan, same as
  your other projects using Cloud Functions)

## 2. Configure

Copy your Firebase config into `src/firebase.ts` (replace the placeholder values).

## 3. Install & run locally

```bash
npm install
npm run dev
```

## 4. Deploy Firestore rules

```bash
firebase deploy --only firestore:rules
```

## 5. Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## 6. Build & deploy the app

```bash
npm run build
firebase deploy --only hosting
```

## 7. First run — create your account and vault

1. Open the deployed URL.
2. Sign in (you'll need to first create your user in Firebase Console → Authentication,
   or add a simple sign-up flow if you'd prefer self-service).
3. On first login, you'll be asked to set a **Master Password** — this is the one
   your lawyer will hold a sealed copy of. It is never stored anywhere by the app.
4. Add your accounts, investments, insurance, contacts, and document locations.

## 8. Arrange the lawyer custody

- Write the Master Password on paper, seal it in an envelope with your panel lawyer.
- Give your lawyer a copy of `GUIDE.md` (fill in the bracketed placeholders first —
  your app URL, lawyer's contact, executor names/phone numbers).
- Add a clause to your wasiat referencing "digital estate access held with
  [lawyer name/firm]" — do not put the password itself in the will.

## Notes on how the security model works

- Every record (`accounts`, `investments`, `insurance`, `documents`, `wasiat`,
  `trustedContacts`) is encrypted in the browser with a key derived from your
  Master Password (PBKDF2 → AES-GCM) before it's saved to Firestore.
- Firestore and Cloud Functions only ever see ciphertext — nothing server-side
  can decrypt your data, including the weekly sealed export.
- The Master Password is **never** transmitted, stored, or logged by this app.
  Losing it means losing access — which is why the lawyer-held sealed copy is
  the real recovery path, not anything inside the app itself.
- Firestore security rules restrict every document to `request.auth.uid` — no
  cross-user access is possible even if someone else signs in.

## Folder structure

```
src/
  firebase.ts              Firebase init
  lib/crypto.ts            AES-GCM encrypt/decrypt + PBKDF2 key derivation
  lib/types.ts             Record type definitions
  lib/useEncryptedCollection.ts   Shared CRUD hook for all record types
  context/AuthContext.tsx  Firebase auth + in-memory vault unlock state
  components/Layout.tsx    Sidebar navigation shell
  components/RecordManager.tsx   Shared list/form UI for every record type
  pages/                   Dashboard, Accounts, Investments, Insurance,
                           Contacts, DocumentsLocator, Wasiat, Settings,
                           Login, VaultSetup, VaultUnlock
functions/index.js         Scheduled + on-demand sealed export (ciphertext only)
firestore.rules            Per-user access rules
GUIDE.md                   Printable note for your executor/family
```
