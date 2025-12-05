/**
 * User Service
 * Handles user profile-specific business logic and CRUD operations on the 'Users' table.
 */

import { BaseService } from './base.service';
import type { User, CreateUserDTO } from '../models/user.model';

export class UserService extends BaseService {
    async createUser(
        userId: string,
        dto: CreateUserDTO
    ): Promise<{ data: User | null; error: any }> {
        try {
            const insertData = {
                id: userId,
                email: dto.email,
                full_name: dto.full_name || null,
                whatsapp_number: dto.whatsapp_number || null,
            }
            const { data: newUser, error: error } = await this.repos.users.create(insertData);

            if (error) {
                return { data: null, error };
            }

            return { data: newUser, error: null };
        } catch (err) {
            return { data: null, error: err };
        }
    }
}