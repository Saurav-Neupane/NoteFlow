import { uploadToCloudinary } from './cloudinary';

/**
 * Attachment/avatar storage — backed by Cloudinary unsigned uploads.
 *
 * This module keeps the historical `uploadFile` / `deleteFile` surface so the
 * rest of the app (note service, editor) doesn't need to know the backend, but
 * every byte now goes to Cloudinary rather than Firebase Storage.
 */

export type UploadKind = 'avatar' | 'attachment';

export async function uploadFile(
  _userId: string,
  _kind: UploadKind,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const { secureUrl, publicId } = await uploadToCloudinary(file);
  // `path` carries the Cloudinary public_id (used for reference / server-side
  // cleanup); `publicUrl` is the CDN URL stored on the note.
  return { path: publicId, publicUrl: secureUrl };
}

/**
 * Client-side deletion is a no-op for unsigned Cloudinary uploads (deleting an
 * asset requires a signed request with the API secret, which must never live in
 * the browser). Resolves silently so best-effort cleanup callers don't fail.
 */
export async function deleteFile(_path: string): Promise<void> {
  return;
}

/** With Cloudinary the stored `publicUrl` is already the canonical CDN URL. */
export async function publicUrlFor(path: string): Promise<string> {
  return path;
}
