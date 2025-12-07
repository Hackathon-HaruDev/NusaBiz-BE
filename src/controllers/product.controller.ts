/**
 * Product Controller
 * Handle product management operations
 */

import { Request, Response } from "express";
import { initializeApp, supabase } from "../api/supabase/client";
import { successResponse, ErrorCodes } from "../utils/response.util";
import {
  isNonEmptyString,
  isNonNegativeNumber,
  isInteger,
  sanitizeString,
  isPositiveNumber,
} from "../utils/validation.util";
import { uploadProductImage, deleteProductImage } from "../utils/storage.util";
import { AppError } from "../middlewares/error.middleware";

const { repos, services } = initializeApp();

/**
 * Helper: Verify business ownership
 */
async function verifyBusinessOwnership(
  businessId: number,
  userEmail: string
): Promise<void> {
  const { data: business } = await repos.businesses.findById(businessId);
  if (!business) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "Business not found");
  }

  const { data: user } = await repos.users.findByEmail(userEmail);
  if (!user || business.user_id !== user.id) {
    throw new AppError(
      403,
      ErrorCodes.UNAUTHORIZED,
      "Not authorized to access this business"
    );
  }
}

/**
 * Create product
 * POST /api/v1/businesses/:businessId/products
 */
export async function createProduct(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      "User not authenticated"
    );
  }

  const businessId = parseInt(req.params.businessId);
  const { name, base_stock, current_stock, purchase_price, selling_price } =
    req.body;
  const productImageFile = req.file;

  if (isNaN(businessId)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Invalid business ID");
  }

  // Validate required fields
  if (!name || !isNonEmptyString(name)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Product name is required"
    );
  }

  // Validate numbers
  if (current_stock !== undefined && !isNonNegativeNumber(current_stock)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Stock must be a non-negative number"
    );
  }

  if (purchase_price !== undefined && !isNonNegativeNumber(purchase_price)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Purchase price must be a non-negative number"
    );
  }

  if (selling_price !== undefined && !isNonNegativeNumber(selling_price)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Selling price must be a non-negative number"
    );
  }

  if (
    base_stock !== undefined &&
    base_stock !== null &&
    !isNonNegativeNumber(base_stock)
  ) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Base stock must be a non-negative number"
    );
  }

  // Verify business ownership
  await verifyBusinessOwnership(businessId, req.user.email);

  // Determine stock status
  const stock = current_stock || 0;
  let stock_status: "active" | "low" | "out" = "active";
  if (stock === 0) stock_status = "out";
  else if (stock < 10) stock_status = "low";

  let imageUrl: string | null = null;
  let createdProduct: any = null;

  try {
    // Create product
    const { data: product, error } = await repos.products.create({
      business_id: businessId,
      name: sanitizeString(name),
      base_stock: base_stock ?? stock ?? 0, // Use base_stock, or current_stock, or 0 as default
      current_stock: stock,
      purchase_price: purchase_price || null,
      selling_price: selling_price || null,
      stock_status,
      image: null,
    });

    if (error || !product) {
      console.error("Product creation error:", error);
      throw new AppError(
        500,
        ErrorCodes.SERVER_ERROR,
        "Failed to create product"
      );
    }

    createdProduct = product;

    if (productImageFile) {
      const { url, error: uploadError } = await uploadProductImage(
        supabase,
        createdProduct.id,
        productImageFile
      );

      if (uploadError || !url) {
        await repos.products.softDelete(createdProduct.id);
        throw new AppError(
          500,
          ErrorCodes.SERVER_ERROR,
          "Failed to upload product image"
        );
      }

      imageUrl = url;

      const { data: updatedProduct, error: updateError } =
        await repos.products.update(createdProduct.id, {
          image: imageUrl,
        });

      if (updateError || !updatedProduct) {
        // Jika update DB gagal, hapus gambar yang baru diunggah (rollback) dan hapus produk
        await deleteProductImage(supabase, imageUrl);
        await repos.products.softDelete(createdProduct.id);
        throw new AppError(
          500,
          ErrorCodes.SERVER_ERROR,
          "Failed to update product image in database"
        );
      }

      createdProduct = updatedProduct;
    }

    res
      .status(201)
      .json(successResponse(createdProduct, "Product created successfully"));
  } catch (error) {
    // Jika ada kesalahan AppError, biarkan error middleware yang menangani
    throw error;
  }
}

/**
 * Get all products for a business
 * GET /api/v1/businesses/:businessId/products
 */
export async function getAllProducts(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      "User not authenticated"
    );
  }

  const businessId = parseInt(req.params.businessId);
  const { status, limit, offset, search } = req.query;

  if (isNaN(businessId)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Invalid business ID");
  }

  // Verify business ownership
  await verifyBusinessOwnership(businessId, req.user.email);

  // Get products
  const { data: allProducts, error } = await repos.products.findByBusinessId(
    businessId
  );

  if (error) {
    throw new AppError(
      500,
      ErrorCodes.SERVER_ERROR,
      "Failed to fetch products"
    );
  }

  let products = allProducts || [];

  // Apply filters
  if (status) {
    products = products.filter((p) => p.stock_status === status);
  }

  if (search) {
    const searchLower = (search as string).toLowerCase();
    products = products.filter((p) =>
      p.name.toLowerCase().includes(searchLower)
    );
  }

  // Apply pagination
  const total = products.length;
  const limitNum = limit ? parseInt(limit as string) : 50;
  const offsetNum = offset ? parseInt(offset as string) : 0;

  products = products.slice(offsetNum, offsetNum + limitNum);

  res.status(200).json(
    successResponse({
      products,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total,
      },
    })
  );
}

/**
 * Get low stock products
 * GET /api/v1/businesses/:businessId/products/low-stock
 */
export async function getLowStockProducts(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      "User not authenticated"
    );
  }

  const businessId = parseInt(req.params.businessId);
  const { threshold } = req.query;

  if (isNaN(businessId)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Invalid business ID");
  }

  // Verify business ownership
  await verifyBusinessOwnership(businessId, req.user.email);

  const thresholdNum = threshold ? parseInt(threshold as string) : 10;

  // Get low stock products
  const { data: products, error } = await repos.products.findLowStock(
    businessId,
    thresholdNum
  );

  if (error) {
    throw new AppError(
      500,
      ErrorCodes.SERVER_ERROR,
      "Failed to fetch low stock products"
    );
  }

  res.status(200).json(successResponse(products || []));
}

/**
 * Get product by ID
 * GET /api/v1/businesses/:businessId/products/:productId
 */
export async function getProductById(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      "User not authenticated"
    );
  }

  const businessId = parseInt(req.params.businessId);
  const productId = parseInt(req.params.productId);

  if (isNaN(businessId) || isNaN(productId)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid business or product ID"
    );
  }

  // Verify business ownership
  await verifyBusinessOwnership(businessId, req.user.email);

  // Get product
  const { data: product, error } = await repos.products.findById(productId);

  if (error || !product) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "Product not found");
  }

  // Verify product belongs to business
  if (product.business_id !== businessId) {
    throw new AppError(
      403,
      ErrorCodes.UNAUTHORIZED,
      "Product does not belong to this business"
    );
  }

  res.status(200).json(successResponse(product));
}

/**
 * Update product
 * PUT /api/v1/businesses/:businessId/products/:productId
 */
export async function updateProduct(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      "User not authenticated"
    );
  }

  const businessId = parseInt(req.params.businessId);
  const productId = parseInt(req.params.productId);
  const { name, purchase_price, selling_price, base_stock } = req.body;
  const productImageFile = req.file;

  if (isNaN(businessId) || isNaN(productId)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid business or product ID"
    );
  }

  // Verify business ownership
  await verifyBusinessOwnership(businessId, req.user.email);

  // Verify product exists and belongs to business
  const { data: product } = await repos.products.findById(productId);
  if (!product || product.business_id !== businessId) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "Product not found");
  }

  // Validate prices
  if (purchase_price !== undefined && !isNonNegativeNumber(purchase_price)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Purchase price must be a non-negative number"
    );
  }

  if (selling_price !== undefined && !isNonNegativeNumber(selling_price)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Selling price must be a non-negative number"
    );
  }

  if (
    base_stock !== undefined &&
    base_stock !== null &&
    !isNonNegativeNumber(base_stock)
  ) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Base stock must be a non-negative number"
    );
  }

  let newImageUrl: string | null = null;
  const oldImageUrl: string | null = product.image;

  try {
    if (productImageFile) {
      // Upload gambar baru
      const { url, error: uploadError } = await uploadProductImage(
        supabase,
        productId,
        productImageFile
      );

      if (uploadError || !url) {
        throw new AppError(
          500,
          ErrorCodes.SERVER_ERROR,
          "Failed to upload product image"
        );
      }

      newImageUrl = url;

      if (oldImageUrl) {
        await deleteProductImage(supabase, oldImageUrl);
      }
    }

    const updateData: any = {
      name: name ? sanitizeString(name) : undefined,
      base_stock: base_stock !== undefined ? base_stock : undefined,
      purchase_price: purchase_price !== undefined ? purchase_price : undefined,
      selling_price: selling_price !== undefined ? selling_price : undefined,
    };

    if (newImageUrl) {
      updateData.image = newImageUrl;
    }

    const { data: updatedProduct, error } = await repos.products.update(
      productId,
      updateData
    );

    if (error || !updatedProduct) {
      if (newImageUrl) {
        await deleteProductImage(supabase, newImageUrl);
      }
      throw new AppError(
        500,
        ErrorCodes.SERVER_ERROR,
        "Failed to update product"
      );
    }

    res
      .status(200)
      .json(successResponse(updatedProduct, "Product updated successfully"));
  } catch (error) {
    if (newImageUrl && error instanceof AppError) {
      await deleteProductImage(supabase, newImageUrl);
    }
    throw error;
  }
}

/**
 * Delete product
 * DELETE /api/v1/businesses/:businessId/products/:productId
 */
export async function deleteProduct(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      "User not authenticated"
    );
  }

  const businessId = parseInt(req.params.businessId);
  const productId = parseInt(req.params.productId);

  if (isNaN(businessId) || isNaN(productId)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid business or product ID"
    );
  }

  // Verify business ownership
  await verifyBusinessOwnership(businessId, req.user.email);

  // Verify product exists and belongs to business
  const { data: product } = await repos.products.findById(productId);
  if (!product || product.business_id !== businessId) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "Product not found");
  }

  // Soft delete
  const { error } = await repos.products.softDelete(productId);

  if (error) {
    throw new AppError(
      500,
      ErrorCodes.SERVER_ERROR,
      "Failed to delete product"
    );
  }

  res.status(200).json(successResponse(null, "Product deleted successfully"));
}

/**
 * Batch update stock status
 * POST /api/v1/businesses/:businessId/products/update-stock-status
 */
export async function updateStockStatusBatch(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      "User not authenticated"
    );
  }

  const businessId = parseInt(req.params.businessId);

  if (isNaN(businessId)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Invalid business ID");
  }

  // Verify business ownership
  await verifyBusinessOwnership(businessId, req.user.email);

  // Update stock status for all products
  const { updated, error } = await services.product.updateStockStatusBatch(
    businessId
  );

  if (error) {
    throw new AppError(
      500,
      ErrorCodes.SERVER_ERROR,
      "Failed to update stock status"
    );
  }

  res
    .status(200)
    .json(
      successResponse(
        { updated },
        `Stock status updated for ${updated} products`
      )
    );
}

/**
 * Adjust product stock (increment or decrement current_stock)
 * PATCH /api/v1/businesses/:businessId/products/:productId/stock
 */
export async function adjustStock(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      "User not authenticated"
    );
  }

  const businessId = parseInt(req.params.businessId);
  const productId = parseInt(req.params.productId);
  const { quantityChange } = req.body;

  if (isNaN(businessId) || isNaN(productId)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid business ID or product ID"
    );
  }

  if (quantityChange === undefined || !isInteger(quantityChange)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "quantityChange must be an integer"
    );
  }

  // Verify business ownership
  await verifyBusinessOwnership(businessId, req.user.email);

  // Verify product belongs to business
  const { data: product } = await repos.products.findById(productId);
  if (!product || product.business_id !== businessId) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "Product not found");
  }

  // Use service to manage stock and status
  const { data: updatedProduct, error } =
    await services.product.manageStockAndStatus(productId, quantityChange);

  if (error) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      error.message || "Failed to adjust stock"
    );
  }

  res
    .status(200)
    .json(successResponse(updatedProduct, "Stock adjusted successfully"));
}
