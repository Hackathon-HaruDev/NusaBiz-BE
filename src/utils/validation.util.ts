/**
 * Validation Utilities
 * Input validation helpers
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requirements: minimum 8 characters, at least one letter and one number
 */
export function isValidPassword(password: string): boolean {
    if (password.length < 8) return false;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasLetter && hasNumber;
}

/**
 * Validate positive number
 */
export function isPositiveNumber(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && num > 0;
}

/**
 * Validate non-negative number
 */
export function isNonNegativeNumber(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && num >= 0;
}

/**
 * Validate integer
 */
export function isInteger(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && Number.isInteger(num);
}

/**
 * Validate date string (ISO 8601)
 */
export function isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

/**
 * Validate required string (not empty)
 */
export function isNonEmptyString(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Sanitize string input (trim whitespace)
 */
export function sanitizeString(value: string): string {
    return value.trim();
}
