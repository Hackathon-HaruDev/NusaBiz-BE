/**
 * Business Routes
 * /api/v1/businesses/*
 */

import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/error.middleware";
import * as businessController from "../controllers/business.controller";
import productRoutes from "./product.routes";
import transactionRoutes from "./transaction.routes";
import aiInsightsRoutes from "./ai-insights.routes";

const router = Router();

// All business routes require authentication
router.use(authenticate);

// Business CRUD
router.post("/", asyncHandler(businessController.createBusiness));
router.get("/", asyncHandler(businessController.getAllBusinesses));
router.get("/:businessId", asyncHandler(businessController.getBusinessById));
router.put("/:businessId", asyncHandler(businessController.updateBusiness));
router.delete("/:businessId", asyncHandler(businessController.deleteBusiness));

// Business analytics
router.get(
  "/:businessId/overview",
  asyncHandler(businessController.getBusinessOverview)
);
router.get(
  "/:businessId/balance-summary",
  asyncHandler(businessController.getBalanceSummary)
);

// Mount nested routes
router.use("/:businessId/products", productRoutes);
router.use("/:businessId/transactions", transactionRoutes);
router.use("/:businessId/ai", aiInsightsRoutes);

export default router;
