import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { encryptData, decryptData } from './crypto';

/**
 * Generic hook: subscribes to users/{uid}/{collectionName}, decrypting each
 * document's `payload` field with the in-memory master password.
 * Every page (Accounts, Investments, Insurance, ...) uses this the same way,
 * so the interface behaves consistently across record types.
 */
export function useEncryptedCollection<T extends { id: string }>(collectionName: string) {
  const { user, masterPassword, salt } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !masterPassword || !salt) {
      setItems([]);
      setLoading(false);
      return;
    }
    const colRef = collection(db, 'users', user.uid, collectionName);
    const unsub = onSnapshot(colRef, async (snap) => {
      const decrypted: T[] = [];
      for (const d of snap.docs) {
        try {
          const raw = d.data().payload as string;
          const item = await decryptData<T>(raw, masterPassword, salt);
          decrypted.push({ ...item, id: d.id });
        } catch {
          // Skip anything that fails to decrypt (wrong password / corrupted entry)
        }
      }
      setItems(decrypted);
      setLoading(false);
    });
    return unsub;
  }, [user, masterPassword, salt, collectionName]);

  const save = useCallback(
    async (item: T) => {
      if (!user || !masterPassword || !salt) throw new Error('Vault is locked');
      const payload = await encryptData(item, masterPassword, salt);
      await setDoc(doc(db, 'users', user.uid, collectionName, item.id), {
        payload,
        updatedAt: new Date().toISOString()
      });
    },
    [user, masterPassword, salt, collectionName]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not signed in');
      await deleteDoc(doc(db, 'users', user.uid, collectionName, id));
    },
    [user, collectionName]
  );

  return { items, loading, save, remove };
}
