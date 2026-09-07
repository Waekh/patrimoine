/**
 * Structured logger. Never pass wealth figures, asset lists, tokens, passwords
 * or addresses in `context`: only identifiers, codes and durations.
 */
type Level = "debug" | "info" | "warn" | "error";

const FORBIDDEN_KEYS = /password|token|secret|amount|value|cents|iban|email|location/i;

function sanitize(context: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!context) return {};
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    safe[key] = FORBIDDEN_KEYS.test(key) ? "[redacted]" : value;
  }
  return safe;
}

function write(level: Level, message: string, context?: Record<string, unknown>): void {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...sanitize(context),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function errorId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  /** Logs an error with a short id that can be shown to the user for support. */
  error: (message: string, error: unknown, context?: Record<string, unknown>): string => {
    const id = errorId();
    write("error", message, {
      ...context,
      errorId: id,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return id;
  },
};
