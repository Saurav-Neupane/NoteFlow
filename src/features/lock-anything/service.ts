import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/services/firebase';

const functions = getFunctions(app);
export interface LockedSecret {
  id: string; title: string; createdAt: string; unlockAt: string;
  timezone: string; status: 'ACTIVE' | 'EXPIRED'; serverTime: string;
}

const listCall = httpsCallable<void, { serverTime: string; secrets: LockedSecret[] }>(functions, 'getLockedSecrets');
const createCall = httpsCallable(functions, 'createLockedSecret');
const revealCall = httpsCallable<{ id: string }, { secret: string; serverTime: string; status: string }>(functions, 'revealLockedSecret');
const deleteCall = httpsCallable<{ id: string }, { ok: boolean }>(functions, 'deleteUnlockedSecret');

export async function listSecrets() { return (await listCall()).data; }
export async function createSecret(input: { title: string; secret: string; timezone: string; durationDays?: number; unlockAt?: string }) {
  return (await createCall(input)).data as LockedSecret;
}
export async function revealSecret(id: string) { return (await revealCall({ id })).data; }
export async function deleteSecret(id: string) { await deleteCall({ id }); }
