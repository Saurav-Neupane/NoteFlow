"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUnlockedSecret = exports.revealLockedSecret = exports.getLockedSecrets = exports.createLockedSecret = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const node_crypto_1 = require("node:crypto");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const vaultKey = (0, params_1.defineSecret)('LOCK_ANYTHING_KEY');
const durations = new Set([1, 7, 15, 30, 60, 90]);
function uidOf(request) {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in to use Lock Anything.');
    return request.auth.uid;
}
function keyBytes() {
    const key = Buffer.from(vaultKey.value(), 'base64');
    if (key.length !== 32)
        throw new https_1.HttpsError('internal', 'Vault encryption is not configured.');
    return key;
}
function decrypt(data) {
    const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', keyBytes(), Buffer.from(data.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(data.authTag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data.ciphertext, 'base64')), decipher.final()]).toString('utf8');
}
function publicRecord(id, data, now) {
    const expired = now.toMillis() >= data.unlockAt.toMillis();
    return {
        id, title: data.title, createdAt: data.createdAt.toDate().toISOString(),
        unlockAt: data.unlockAt.toDate().toISOString(), timezone: data.timezone,
        status: expired ? 'EXPIRED' : 'ACTIVE', serverTime: now.toDate().toISOString(),
    };
}
exports.createLockedSecret = (0, https_1.onCall)({ secrets: [vaultKey], enforceAppCheck: true }, async (request) => {
    const uid = uidOf(request);
    const { title = '', secret, durationDays, unlockAt, timezone } = request.data ?? {};
    if (typeof secret !== 'string' || !secret.trim() || secret.length > 10000)
        throw new https_1.HttpsError('invalid-argument', 'Enter a secret of 1–10,000 characters.');
    if (typeof title !== 'string' || title.length > 120)
        throw new https_1.HttpsError('invalid-argument', 'Secret name must be 120 characters or fewer.');
    if (typeof timezone !== 'string' || timezone.length > 80)
        throw new https_1.HttpsError('invalid-argument', 'Select a valid timezone.');
    try {
        new Intl.DateTimeFormat('en', { timeZone: timezone });
    }
    catch {
        throw new https_1.HttpsError('invalid-argument', 'Select a valid IANA timezone.');
    }
    const now = firestore_1.Timestamp.now();
    let unlockTimestamp;
    if (durationDays !== undefined) {
        if (!Number.isInteger(durationDays) || !durations.has(durationDays))
            throw new https_1.HttpsError('invalid-argument', 'Unsupported duration.');
        unlockTimestamp = firestore_1.Timestamp.fromMillis(now.toMillis() + durationDays * 24 * 60 * 60 * 1000);
    }
    else {
        const parsed = typeof unlockAt === 'string' ? Date.parse(unlockAt) : NaN;
        if (!Number.isFinite(parsed) || parsed <= now.toMillis())
            throw new https_1.HttpsError('invalid-argument', 'Unlock time must be in the future.');
        if (parsed - now.toMillis() > 366 * 24 * 60 * 60 * 1000)
            throw new https_1.HttpsError('invalid-argument', 'Unlock time must be within one year.');
        unlockTimestamp = firestore_1.Timestamp.fromMillis(parsed);
    }
    const iv = (0, node_crypto_1.randomBytes)(12);
    const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', keyBytes(), iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const ref = db.collection('locked_secrets').doc();
    const record = {
        ownerUid: uid, title: title.trim() || 'Untitled secret', createdAt: now,
        unlockAt: unlockTimestamp, timezone,
        ...(durationDays === undefined ? {} : { durationDays }),
        ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64'),
    };
    await ref.create(record);
    return publicRecord(ref.id, record, now);
});
exports.getLockedSecrets = (0, https_1.onCall)({ enforceAppCheck: true }, async (request) => {
    const uid = uidOf(request);
    const snapshot = await db.collection('locked_secrets').where('ownerUid', '==', uid).get();
    const now = firestore_1.Timestamp.now();
    return { serverTime: now.toDate().toISOString(), secrets: snapshot.docs.map((doc) => publicRecord(doc.id, doc.data(), now)) };
});
exports.revealLockedSecret = (0, https_1.onCall)({ secrets: [vaultKey], enforceAppCheck: true }, async (request) => {
    const uid = uidOf(request);
    const id = request.data?.id;
    if (typeof id !== 'string' || id.length > 150)
        throw new https_1.HttpsError('invalid-argument', 'Invalid secret id.');
    const ref = db.collection('locked_secrets').doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.get('ownerUid') !== uid)
        throw new https_1.HttpsError('not-found', 'Secret not found.');
    const data = snapshot.data();
    const now = firestore_1.Timestamp.now();
    if (now.toMillis() < data.unlockAt.toMillis())
        throw new https_1.HttpsError('failed-precondition', 'This secret is still locked.');
    return { secret: decrypt(data), serverTime: now.toDate().toISOString(), status: 'EXPIRED' };
});
exports.deleteUnlockedSecret = (0, https_1.onCall)({ enforceAppCheck: true }, async (request) => {
    const uid = uidOf(request);
    const id = request.data?.id;
    if (typeof id !== 'string' || id.length > 150)
        throw new https_1.HttpsError('invalid-argument', 'Invalid secret id.');
    const ref = db.collection('locked_secrets').doc(id);
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists || snapshot.get('ownerUid') !== uid)
            throw new https_1.HttpsError('not-found', 'Secret not found.');
        if (firestore_1.Timestamp.now().toMillis() < snapshot.get('unlockAt').toMillis())
            throw new https_1.HttpsError('failed-precondition', 'A locked secret cannot be deleted.');
        transaction.delete(ref);
        transaction.create(db.collection('vault_audit').doc(), { ownerUid: uid, secretId: id, action: 'DELETED', at: firestore_1.FieldValue.serverTimestamp() });
    });
    return { ok: true };
});
