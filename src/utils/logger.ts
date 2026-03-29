/**
 * Simple logging utility for production applications
 * This provides basic error handling that satisfies both ESLint and SonarQube
 */

declare const Sentry:
  | {
      captureException: (error: unknown, options?: { contexts?: Record<string, unknown> }) => void;
    }
  | undefined;

/**
 * Log errors in a way that satisfies both ESLint (no console) and SonarQube (handle exceptions)
 * In production, you would replace this with a proper logging system like Winston, Sentry, etc.
 * @param error - The error to handle
 * @param context - Context for the error
 * @param fallback - Optional fallback function to execute
 * @param metadata - Additional metadata to include in logs
 */
export function handleError(
  error: unknown,
  context: string,
  fallback?: () => void,
  metadata?: Record<string, unknown>
): void {
  // In development, you might want to log to console
  // In production, you would send to a logging service
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(`[${context}]`, error, metadata ? { metadata } : '');
  }

  // For production, capture in Sentry if available
  if (typeof Sentry !== 'undefined' && Sentry.captureException) {
    try {
      Sentry.captureException(error, {
        contexts: {
          context: {
            context,
            ...metadata,
          },
        },
      });
    } catch (sentryError) {
      // eslint-disable-next-line no-console
      console.error('Failed to capture error in Sentry:', sentryError);
    }
  }

  // Execute fallback if provided
  if (fallback) {
    fallback();
  }
}

/**
 * Log warnings in development only
 */
export function logWarning(message: string, context: string): void {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.warn(`[${context}]`, message);
  }
}

/**
 * Log informational messages in development only
 */
export function logInfo(message: string, context: string): void {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.info(`[${context}]`, message);
  }
}
