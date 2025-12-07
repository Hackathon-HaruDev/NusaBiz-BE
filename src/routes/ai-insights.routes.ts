/**
 * AI Insights Routes
 * /api/v1/businesses/:businessId/ai/*
 */

import { Router } from "express";
import { asyncHandler } from "../middlewares/error.middleware";
import * as aiInsightsController from "../controllers/ai-insights.controller";

const router = Router({ mergeParams: true });

// AI Insights endpoints
router.get("/insights", asyncHandler(aiInsightsController.getBusinessInsights));
router.get(
  "/cashflow-forecast",
  asyncHandler(aiInsightsController.getCashflowForecast)
);
router.get(
  "/cost-recommendations",
  asyncHandler(aiInsightsController.getCostRecommendations)
);
router.get(
  "/sales-recommendations",
  asyncHandler(aiInsightsController.getSalesRecommendations)
);
router.get(
  "/stock-forecast",
  asyncHandler(aiInsightsController.getStockForecast)
);

// AI Chat endpoints
router.post("/chat", asyncHandler(aiInsightsController.chatWithAI));
router.get("/chat/history", asyncHandler(aiInsightsController.getChatHistory));
router.get("/chats", asyncHandler(aiInsightsController.getAllChats));
router.get("/chats/:chatId", asyncHandler(aiInsightsController.getChatById));

export default router;
