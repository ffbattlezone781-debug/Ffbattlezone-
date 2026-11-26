import { getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { doc, getDocFromServer, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { FirestoreTimestampLike, UserRecord } from './types';

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    experimentalLongPollingOptions: { timeoutSeconds: 20 },
  },
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);

export function getSecondaryAuth(): Auth {
  const existing = getApps().find((a) => a.name === 'manager-provisioner');
  const secondaryApp = existing || initializeApp(firebaseConfig, 'manager-provisioner');
  return getAuth(secondaryApp);
}

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(retried = false): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      if (!retried) {
        setTimeout(() => {
          void testConnection(true);
        }, 1500);
        return;
      }
      console.error('Please check your Firebase configuration.');
    }
  }
}

export const MAP_IMAGES: Record<string, string> = {
  Bermuda: '/src/assets/images/map_bermuda_island_1795425009794.jpg',
  Purgatory: '/src/assets/images/map_purgatory_valley_1795425010252.jpg',
  Kalahari: '/src/assets/images/hero_mega_tournament_1795425010400.jpg',
  Alpine: '/src/assets/images/hero_solo_rush_1795425010236.jpg',
  NeXTerra: '/src/assets/images/hero_clash_squad_1795425009518.jpg',
  Craftland: '/src/assets/images/map_craftland_arena_1795425009789.jpg',
};

export function getWithdrawableBalance(u?: Partial<UserRecord> | null): number {
  if (!u) return 0;
  const bal = Number(u.walletBalance || 0);
  const rawWin =
    typeof u.winningBalance === 'number'
      ? u.winningBalance
      : Number(u.totalWinnings || 0);
  return Math.max(0, Math.min(bal, rawWin));
}

export function formatTimestamp(ts?: FirestoreTimestampLike): string {
  if (!ts) return 'Just now';
  if (typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (typeof ts.seconds === 'number') {
    return new Date(ts.seconds * 1000).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return 'Just now';
}

export function compressImageToDataUrl(
  file: File,
  maxWidth = 960,
  maxChars = 228000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file is not a valid image.'));
      img.onload = () => {
        let width = Math.min(maxWidth, img.width || maxWidth);
        let height = Math.round(((img.height || width) / (img.width || width)) * width);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        let quality = 0.82;
        let dataUrl = '';
        for (let attempt = 0; attempt < 7; attempt++) {
          canvas.width = Math.max(120, Math.round(width));
          canvas.height = Math.max(90, Math.round(height));
          ctx.fillStyle = '#0A0A0F';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          if (dataUrl.length <= maxChars) {
            resolve(dataUrl);
            return;
          }
          quality = Math.max(0.35, quality - 0.12);
          width *= 0.84;
          height *= 0.84;
        }
        if (dataUrl.length <= 245000) {
          resolve(dataUrl);
        } else {
          reject(new Error('Image is still too large after compression. Choose a smaller image.'));
        }
      };
      img.src = String(ev.target?.result || '');
    };
    reader.readAsDataURL(file);
  });
}
