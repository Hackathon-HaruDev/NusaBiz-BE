/**
 * User Model
 * Represents a user in the system
 */

export interface User {
    id: string;
    email: string;
    full_name: string | null;
    whatsapp_number: string | null;
    image: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

/**
 * DTO for creating a new user
 */
export interface CreateUserDTO {
    email: string;
    full_name?: string;
    whatsapp_number?: string;
}

/**
 * DTO for updating an existing user
 */
export interface UpdateUserDTO {
    email?: string;
    full_name?: string;
    whatsapp_number?: string;
    image?: string;
}
