import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_UPLOAD_URL,
  MAX_ATTACHMENT_SIZE_MB,
} from '@/constants';
import { DatabaseError } from '@/utils/errors';

/**
 * Cloudinary unsigned uploads.
 *
 * Files are pushed directly from the browser via a multipart `POST` to
 * Cloudinary's upload endpoint using an *unsigned* upload preset — no API
 * secret ever touches the client. The returned `secure_url` is stored on the
 * attachment/note and served straight from Cloudinary's CDN.
 *
 * Note on deletes: unsigned uploads cannot be deleted from the client (deletion
 * requires a signed request with the API secret). We keep the `public_id` so a
 * server-side/admin job could purge assets later, but client-side deletion is a
 * no-op — see `storage.service.ts`.
 */

export interface CloudinaryUploadResult {
  /** HTTPS CDN URL of the uploaded asset. */
  secureUrl: string;
  /** Cloudinary public id (kept for potential server-side deletion). */
  publicId: string;
  /** Cloudinary resource kind (`image`, `video`, `raw`). */
  resourceType: string;
  bytes: number;
  format?: string;
}

/** Upload a single file to Cloudinary using the unsigned preset. */
export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  if (file.size > MAX_ATTACHMENT_SIZE_MB * 1024 * 1024) {
    throw new DatabaseError(`File too large. Maximum size is ${MAX_ATTACHMENT_SIZE_MB}MB.`);
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  let res: Response;
  try {
    res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: form });
  } catch (err) {
    throw new DatabaseError('Upload failed — could not reach Cloudinary.', err);
  }

  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message as string;
    } catch {
      /* non-JSON error body — keep the status message */
    }
    throw new DatabaseError(message);
  }

  const data = (await res.json()) as {
    secure_url?: string;
    public_id?: string;
    resource_type?: string;
    bytes?: number;
    format?: string;
  };

  if (!data.secure_url || !data.public_id) {
    throw new DatabaseError('Upload succeeded but Cloudinary returned no URL.');
  }

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type ?? 'image',
    bytes: data.bytes ?? file.size,
    format: data.format,
  };
}

/**
 * The account name derives the delivery domain; exported for callers that need
 * to build transformation URLs against the same cloud.
 */
export const CLOUDINARY_ACCOUNT = CLOUDINARY_CLOUD_NAME;
