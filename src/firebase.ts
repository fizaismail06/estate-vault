import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBFusHMqELqzqKEcnWRkvXQ2OTTv2_GXTE",
  authDomain: "estate-vault-fiza.firebaseapp.com",
  projectId: "estate-vault-fiza",
  storageBucket: "estate-vault-fiza.firebasestorage.app",
  messagingSenderId: "369092144744",
  appId: "1:369092144744:web:d53ce4368d663c402715dd"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();