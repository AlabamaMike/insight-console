/**
 * Error handling utilities for API requests
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Extract error message from various error formats
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }

  return 'An unexpected error occurred'
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

/**
 * Check if error is an authorization/permission error
 */
export function isPermissionError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403
}

/**
 * Check if error is a not found error
 */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 400
}

/**
 * Check if error is a server error
 */
export function isServerError(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 500
}

/**
 * Format error for display to user
 */
export function formatErrorForDisplay(error: unknown): {
  title: string
  message: string
  severity: 'error' | 'warning' | 'info'
} {
  if (isAuthError(error)) {
    return {
      title: 'Authentication Required',
      message: 'Your session has expired. Please log in again.',
      severity: 'warning',
    }
  }

  if (isPermissionError(error)) {
    return {
      title: 'Access Denied',
      message: 'You do not have permission to perform this action.',
      severity: 'error',
    }
  }

  if (isNotFoundError(error)) {
    return {
      title: 'Not Found',
      message: 'The requested resource could not be found.',
      severity: 'info',
    }
  }

  if (isValidationError(error)) {
    return {
      title: 'Invalid Input',
      message: getErrorMessage(error),
      severity: 'warning',
    }
  }

  if (isServerError(error)) {
    return {
      title: 'Server Error',
      message: 'Something went wrong on our end. Please try again later.',
      severity: 'error',
    }
  }

  return {
    title: 'Error',
    message: getErrorMessage(error),
    severity: 'error',
  }
}
