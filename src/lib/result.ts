/**
 * Typed result used at every boundary (service -> action -> UI). Errors are
 * values, never thrown across layers.
 */
export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export const APP_ERROR_CODES = [
  "VALIDATION",
  "NOT_FOUND",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "CONFLICT",
  "UNAVAILABLE",
  "INTERNAL",
] as const;
export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export interface AppError {
  code: AppErrorCode;
  /** Safe, user-facing message key or text. Never a stack trace. */
  message: string;
  /** Field-level messages for forms. */
  fieldErrors?: Record<string, string[]>;
}

export function appError(
  code: AppErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): AppError {
  return fieldErrors ? { code, message, fieldErrors } : { code, message };
}
