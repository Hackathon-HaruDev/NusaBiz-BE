/**
 * API Response Utilities
 * Standardized response formatting for consistency
 */

export interface SuccessResponse<T = any> {
    success: true;
    data: T;
    message?: string;
}

export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
    };
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * Create a standardized success response
 */
export function successResponse<T>(data: T, message?: string): SuccessResponse<T> {
    return {
        success: true,
        data,
        ...(message && { message }),
    };
}

/**
 * Create a standardized error response
 */
export function errorResponse(
    code: string,
    message: string,
    details?: any
): ErrorResponse {
    return {
        success: false,
        error: {
            code,
            message,
            ...(details && { details }),
        },
    };
}

/**
 * Common error codes
 */
export const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    NOT_FOUND: 'NOT_FOUND',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
    BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
} as const;
