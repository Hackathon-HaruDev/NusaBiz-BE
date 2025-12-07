/**
 * Business Controller
 * Handle business management operations
 */

import { Request, Response } from 'express';
import { initializeApp } from '../api/supabase/client';
import { successResponse, ErrorCodes } from '../utils/response.util';
import { isNonEmptyString, isNonNegativeNumber, sanitizeString } from '../utils/validation.util';
import { AppError } from '../middlewares/error.middleware';

const { repos, services } = initializeApp();

/**
 * Create new business
 * POST /api/v1/businesses
 */
export async function createBusiness(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const { business_name, category, location, current_balance } = req.body;

    // Validate required fields
    if (!business_name || !isNonEmptyString(business_name)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Business name is required');
    }

    // Validate balance if provided
    if (current_balance !== undefined && !isNonNegativeNumber(current_balance)) {
        throw new AppError(
            400,
            ErrorCodes.VALIDATION_ERROR,
            'Current balance must be a non-negative number'
        );
    }

    // Get user ID from database
    const { data: user } = await repos.users.findByEmail(req.user.email);
    if (!user) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found in database');
    }

    // Create business
    const { data: business, error } = await repos.businesses.create({
        user_id: user.id,
        business_name: sanitizeString(business_name),
        category: category ? sanitizeString(category) : undefined,
        location: location ? sanitizeString(location) : undefined,
        current_balance: current_balance || 0,
    });

    if (error || !business) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to create business');
    }

    res.status(201).json(successResponse(business, 'Business created successfully'));
}

/**
 * Get all businesses for authenticated user
 * GET /api/v1/businesses
 */
export async function getAllBusinesses(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    // Get user from database
    const { data: user } = await repos.users.findByEmail(req.user.email);
    if (!user) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }

    // Get all businesses for user
    const { data: businesses, error } = await repos.businesses.findByUserId(user.id);

    if (error) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to fetch businesses');
    }

    res.status(200).json(successResponse(businesses || []));
}

/**
 * Get business by ID
 * GET /api/v1/businesses/:businessId
 */
export async function getBusinessById(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Get business
    const { data: business, error } = await repos.businesses.findById(businessId);

    if (error || !business) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Business not found');
    }

    // Verify ownership
    const { data: user } = await repos.users.findByEmail(req.user.email);
    if (!user || business.user_id !== user.id) {
        throw new AppError(403, ErrorCodes.UNAUTHORIZED, 'Not authorized to access this business');
    }

    res.status(200).json(successResponse(business));
}

/**
 * Update business
 * PUT /api/v1/businesses/:businessId
 */
export async function updateBusiness(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const { business_name, category, location } = req.body;

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Verify ownership
    const { data: business } = await repos.businesses.findById(businessId);
    if (!business) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Business not found');
    }

    const { data: user } = await repos.users.findByEmail(req.user.email);
    if (!user || business.user_id !== user.id) {
        throw new AppError(403, ErrorCodes.UNAUTHORIZED, 'Not authorized to update this business');
    }

    // Update business
    const { data: updatedBusiness, error } = await repos.businesses.update(businessId, {
        business_name: business_name ? sanitizeString(business_name) : undefined,
        category: category ? sanitizeString(category) : undefined,
        location: location ? sanitizeString(location) : undefined,
    });

    if (error || !updatedBusiness) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to update business');
    }

    res.status(200).json(successResponse(updatedBusiness, 'Business updated successfully'));
}

/**
 * Delete business (soft delete)
 * DELETE /api/v1/businesses/:businessId
 */
export async function deleteBusiness(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Verify ownership
    const { data: business } = await repos.businesses.findById(businessId);
    if (!business) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Business not found');
    }

    const { data: user } = await repos.users.findByEmail(req.user.email);
    if (!user || business.user_id !== user.id) {
        throw new AppError(403, ErrorCodes.UNAUTHORIZED, 'Not authorized to delete this business');
    }

    // Soft delete
    const { error } = await repos.businesses.softDelete(businessId);

    if (error) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to delete business');
    }

    res.status(200).json(successResponse(null, 'Business deleted successfully'));
}

/**
 * Get business overview with statistics
 * GET /api/v1/businesses/:businessId/overview
 */
export async function getBusinessOverview(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Verify ownership
    const { data: business } = await repos.businesses.findById(businessId);
    if (!business) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Business not found');
    }

    const { data: user } = await repos.users.findByEmail(req.user.email);
    if (!user || business.user_id !== user.id) {
        throw new AppError(403, ErrorCodes.UNAUTHORIZED, 'Not authorized to access this business');
    }

    // Get overview from business service
    const { data: overview, error } = await services.business.getBusinessOverview(businessId);

    if (error || !overview) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to fetch business overview');
    }

    res.status(200).json(successResponse(overview));
}

/**
 * Get balance summary
 * GET /api/v1/businesses/:businessId/balance-summary
 */
export async function getBalanceSummary(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const { startDate, endDate } = req.query;

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Verify ownership
    const { data: business } = await repos.businesses.findById(businessId);
    if (!business) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Business not found');
    }

    const { data: user } = await repos.users.findByEmail(req.user.email);
    if (!user || business.user_id !== user.id) {
        throw new AppError(403, ErrorCodes.UNAUTHORIZED, 'Not authorized to access this business');
    }

    // Build date filter
    const dateFilter =
        startDate && endDate
            ? {
                startDate: startDate as string,
                endDate: endDate as string,
            }
            : undefined;

    // Get balance summary from service
    const { data: summary, error } = await services.business.getBalanceSummary(
        businessId,
        dateFilter
    );

    if (error || !summary) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to fetch balance summary');
    }

    res.status(200).json(successResponse(summary));
}
