/** Centralized error handling utilities for NoteFlow. */

export class AppError extends Error {
  code: string;
  /** Whether this error is safe to show to end users verbatim. */
  public: boolean;
  cause?: unknown;

  constructor(
    message: string,
    code = 'UNKNOWN_ERROR',
    opts: { public?: boolean; cause?: unknown } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.public = opts.public ?? false;
    this.cause = opts.cause;
  }
}

export class AuthError extends AppError {
  constructor(message: string, code = 'AUTH_ERROR', cause?: unknown) {
    super(message, code, { public: true, cause });
    this.name = 'AuthError';
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Network request failed', cause?: unknown) {
    super(message, 'NETWORK_ERROR', { public: true, cause });
    this.name = 'NetworkError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'DATABASE_ERROR', { cause });
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', { public: true });
    this.name = 'ValidationError';
  }
}

/** Normalize any thrown value into a user-safe message. */
export function toErrorMessage(err: unknown): string {
  if (err instanceof AppError) {
    return err.public ? err.message : 'Something went wrong. Please try again.';
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

/** Firestore / Storage error codes mapped to messages users can act on. */
const BACKEND_MESSAGES: Record<string, string> = {
  'permission-denied': "You don't have permission to do that.",
  unauthenticated: 'Your session expired. Please sign in again.',
  'not-found': 'That item no longer exists.',
  'already-exists': 'That item already exists.',
  unavailable: 'Cannot reach the server. Check your connection and try again.',
  'deadline-exceeded': 'The request took too long. Please try again.',
  'resource-exhausted': 'Usage limit reached. Please try again later.',
  cancelled: 'The request was cancelled.',
  'failed-precondition': 'That action is not possible right now.',
  'invalid-argument': 'Some of the submitted data was invalid.',
  'storage/unauthorized': "You don't have permission to access that file.",
  'storage/canceled': 'The upload was cancelled.',
  'storage/quota-exceeded': 'Storage quota exceeded.',
  'storage/object-not-found': 'That file no longer exists.',
};

/** Pull a backend error code off a raw error or an AppError's cause. */
function backendCode(err: unknown): string | undefined {
  const candidates = [err, err instanceof AppError ? err.cause : undefined];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && 'code' in candidate) {
      const code = (candidate as { code?: unknown }).code;
      if (typeof code === 'string' && code in BACKEND_MESSAGES) return code;
    }
  }
  return undefined;
}

/**
 * Best user-facing message for any thrown value: a mapped backend code when we
 * recognize one, the error's own message when it was marked public, and a
 * neutral fallback otherwise so internals never leak into the UI.
 */
export function toPublicMessage(err: unknown): string {
  const code = backendCode(err);
  if (code) return BACKEND_MESSAGES[code];
  return toErrorMessage(err);
}

/** Normalize any thrown value into a stable error code. */
export function toErrorCode(err: unknown): string {
  if (err instanceof AppError) return err.code;
  return 'UNKNOWN_ERROR';
}

/** Attempt to run a fallible function and return a normalized Result. */
export async function tryAsync<T>(fn: () => Promise<T>): Promise<
  { ok: true; data: T } | { ok: false; error: AppError }
> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof AppError ? err : new AppError(toErrorMessage(err)),
    };
  }
}