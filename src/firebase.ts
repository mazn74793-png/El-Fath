import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the critical firestoreDatabaseId matching our custom provisioned database
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Enable offline-first IndexedDB persistence
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('Firebase IndexedDB Offline Persistence enabled successfully.');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore offline persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore offline persistence failed: Browser does not support IndexedDB');
    } else {
      console.error('Firestore offline persistence failed:', err);
    }
  });

// Programmatic background anonymous sign-in to satisfy Zero-Trust security rules
signInAnonymously(auth)
  .then(() => {
    console.log('Programmatically authenticated session for secure operations.');
  })
  .catch((err) => {
    console.warn('Anonymous authentication restricted or disabled; continuing in unauthenticated mode safely.', err.message);
  });

// Validate connection to Firestore as requested by the critical skill constraints
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn('Firestore diagnostic: Client started in offline mode (cache-active).');
    }
  }
}
testConnection();

// Global Operations Error Handlers
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
