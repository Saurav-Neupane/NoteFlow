import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

initializeApp();
const db = getFirestore();
const vaultKey = defineSecret('LOCK_ANYTHING_KEY');
const durations = new Set([1, 7, 15, 30, 60, 90]);

type Metadata = {
  ownerUid: string;
  title: string;
  createdAt: Timestamp;
  unlockAt: Timestamp;
  timezone: string;
  durationDays?: number;
  ciphertext: string;
  iv: string;
  authTag: string;
};

function uidOf(request: { auth?: { uid: string } }) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to use Lock Anything.');
  return request.auth.uid;
}

function keyBytes(): Buffer {
  const key = Buffer.from(vaultKey.value(), 'base64');
  if (key.length !== 32) throw new HttpsError('internal', 'Vault encryption is not configured.');
  return key;
}

function decrypt(data: Metadata): string {
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(data.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(data.authTag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data.ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

function publicRecord(id: string, data: Metadata, now: Timestamp) {
  const expired = now.toMillis() >= data.unlockAt.toMillis();
  return {
    id, title: data.title, createdAt: data.createdAt.toDate().toISOString(),
    unlockAt: data.unlockAt.toDate().toISOString(), timezone: data.timezone,
    status: expired ? 'EXPIRED' : 'ACTIVE', serverTime: now.toDate().toISOString(),
  };
}

export const createLockedSecret = onCall({ secrets: [vaultKey] }, async (request) => {
  const uid = uidOf(request);
  const { title = '', secret, durationDays, unlockAt, timezone } = request.data ?? {};
  if (typeof secret !== 'string' || !secret.trim() || secret.length > 10000) throw new HttpsError('invalid-argument', 'Enter a secret of 1–10,000 characters.');
  if (typeof title !== 'string' || title.length > 120) throw new HttpsError('invalid-argument', 'Secret name must be 120 characters or fewer.');
  if (typeof timezone !== 'string' || timezone.length > 80) throw new HttpsError('invalid-argument', 'Select a valid timezone.');
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { throw new HttpsError('invalid-argument', 'Select a valid IANA timezone.'); }

  const now = Timestamp.now();
  let unlockTimestamp: Timestamp;
  if (durationDays !== undefined) {
    if (!Number.isInteger(durationDays) || !durations.has(durationDays)) throw new HttpsError('invalid-argument', 'Unsupported duration.');
    unlockTimestamp = Timestamp.fromMillis(now.toMillis() + durationDays * 24 * 60 * 60 * 1000);
  } else {
    const parsed = typeof unlockAt === 'string' ? Date.parse(unlockAt) : NaN;
    if (!Number.isFinite(parsed) || parsed <= now.toMillis()) throw new HttpsError('invalid-argument', 'Unlock time must be in the future.');
    if (parsed - now.toMillis() > 366 * 24 * 60 * 60 * 1000) throw new HttpsError('invalid-argument', 'Unlock time must be within one year.');
    unlockTimestamp = Timestamp.fromMillis(parsed);
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const ref = db.collection('locked_secrets').doc();
  const record: Metadata = {
    ownerUid: uid, title: title.trim() || 'Untitled secret', createdAt: now,
    unlockAt: unlockTimestamp, timezone,
    ...(durationDays === undefined ? {} : { durationDays }),
    ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64'),
  };
  await ref.create(record);
  return publicRecord(ref.id, record, now);
});

export const getLockedSecrets = onCall({  async (request) => {
  const uid = uidOf(request);
  const snapshot = await db.collection('locked_secrets').where('ownerUid', '==', uid).get();
  const now = Timestamp.now();
  return { serverTime: now.toDate().toISOString(), secrets: snapshot.docs.map((doc) => publicRecord(doc.id, doc.data() as Metadata, now)) };
});

export const revealLockedSecret = onCall({ secrets: [vaultKey] }, async (request) => {
  const uid = uidOf(request);
  const id = request.data?.id;
  if (typeof id !== 'string' || id.length > 150) throw new HttpsError('invalid-argument', 'Invalid secret id.');
  const ref = db.collection('locked_secrets').doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.get('ownerUid') !== uid) throw new HttpsError('not-found', 'Secret not found.');
  const data = snapshot.data() as Metadata;
  const now = Timestamp.now();
  if (now.toMillis() < data.unlockAt.toMillis()) throw new HttpsError('failed-precondition', 'This secret is still locked.');
  return { secret: decrypt(data), serverTime: now.toDate().toISOString(), status: 'EXPIRED' };
});

export const deleteUnlockedSecret = onCall({  async (request) => {
  const uid = uidOf(request);
  const id = request.data?.id;
  if (typeof id !== 'string' || id.length > 150) throw new HttpsError('invalid-argument', 'Invalid secret id.');
  const ref = db.collection('locked_secrets').doc(id);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists || snapshot.get('ownerUid') !== uid) throw new HttpsError('not-found', 'Secret not found.');
    if (Timestamp.now().toMillis() < (snapshot.get('unlockAt') as Timestamp).toMillis()) throw new HttpsError('failed-precondition', 'A locked secret cannot be deleted.');
    transaction.delete(ref);
    transaction.create(db.collection('vault_audit').doc(), { ownerUid: uid, secretId: id, action: 'DELETED', at: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});
