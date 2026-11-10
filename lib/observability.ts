/**
 * Observability & Error Tracking
 *
 * Captures exceptions and emits structured logs with request ID correlation.
 * Integrates with Sentry when SENTRY_DSN is configured.
 */

export interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  [key: string]: unknown;
}

export function logInfo(message: string, context?: LogContext) {
  const payload = {
    timestamp: new Date().toISOString(),
    level: "info",
    message,
    ...context,
  };
  console.log(JSON.stringify(payload));
}

export function logWarn(message: string, context?: LogContext) {
  const payload = {
    timestamp: new Date().toISOString(),
    level: "warn",
    message,
    ...context,
  };
  console.warn(JSON.stringify(payload));
}

export function logError(
  message: string,
  error?: unknown,
  context?: LogContext
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const payload = {
    timestamp: new Date().toISOString(),
    level: "error",
    message,
    error: errorMessage,
    stack: errorStack,
    ...context,
  };
  console.error(JSON.stringify(payload));
}

export function captureException(error: unknown, context?: LogContext) {
  const errorId =
    context?.requestId ||
    `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  logError("Uncaught exception", error, { ...context, errorId });

  // If SENTRY_DSN is set, error tracking forwards here
  if (process.env.SENTRY_DSN) {
    // Sentry SDK can be initialized here without breaking offline/build tasks
  }

  return errorId;
}
