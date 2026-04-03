
/**
 * 🛠️ Standardized Error Handling
 * Defines custom error types and a common way to format errors.
 */

import { Logger } from './logger.ts';

export const ErrorCode = {
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

export class GeminiClawError extends Error {
  public code: ErrorCode;
  public details?: any;

  constructor(message: string, code: ErrorCode = ErrorCode.INTERNAL_ERROR, details?: any) {
    super(message);
    this.name = 'GeminiClawError';
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        name: this.name,
        code: this.code,
        message: this.message,
        details: this.details,
      }
    };
  }
}

/**
 * Standardized error handling wrapper for async functions.
 */
export function handleError(logger: Logger, error: any, message: string = 'Operation failed') {
  if (error instanceof GeminiClawError) {
    logger.error(`${message}: ${error.message} (Code: ${error.code})`, error.details);
    return error;
  } else {
    const geminiError = new GeminiClawError(error.message || 'Unknown error', ErrorCode.INTERNAL_ERROR, { original: error });
    logger.error(`${message}: ${geminiError.message}`, geminiError.details);
    return geminiError;
  }
}
