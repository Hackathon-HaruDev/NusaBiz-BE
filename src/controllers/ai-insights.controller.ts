/**
 * AI Insights Controller
 * Handle AI-powered business insights and predictions
 */

import { Request, Response } from "express";
import { initializeApp } from "../api/supabase/client";
import { successResponse, ErrorCodes } from "../utils/response.util";
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
 * Get Auto Business Insights
 * GET /api/v1/businesses/:businessId/ai/insights
 */
export async function getBusinessInsights(
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

  await verifyBusinessOwnership(businessId, req.user.email);

  const { data: insights, error } = await services.ai.generateBusinessInsights(
    businessId
  );

  if (error) {
    throw new AppError(
      500,
      ErrorCodes.SERVER_ERROR,
      "Failed to generate insights"
    );
  }

  res.status(200).json(successResponse(insights));
}

/**
 * Get Cashflow Forecast
 * GET /api/v1/businesses/:businessId/ai/cashflow-forecast
 */
export async function getCashflowForecast(
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
  const { days = "7" } = req.query;

  if (isNaN(businessId)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Invalid business ID");
  }

  await verifyBusinessOwnership(businessId, req.user.email);

  const forecastDays = parseInt(days as string);
  if (isNaN(forecastDays) || forecastDays <= 0) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid forecast days"
    );
  }

  const { data: forecast, error } = await services.ai.generateCashflowForecast(
    businessId,
    forecastDays
  );

  if (error) {
    throw new AppError(
      500,
      ErrorCodes.SERVER_ERROR,
      "Failed to generate forecast"
    );
  }

  res.status(200).json(successResponse(forecast));
}

/**
 * Get Cost Saving Recommendations
 * GET /api/v1/businesses/:businessId/ai/cost-recommendations
 */
export async function getCostRecommendations(
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

  await verifyBusinessOwnership(businessId, req.user.email);

  const { data: recommendations, error } =
    await services.ai.generateCostRecommendations(businessId);

  if (error) {
    throw new AppError(
      500,
      ErrorCodes.SERVER_ERROR,
      "Failed to generate recommendations"
    );
  }

  res.status(200).json(successResponse(recommendations));
}

/**
 * Get Sales Recommendations
 * GET /api/v1/businesses/:businessId/ai/sales-recommendations
 */
export async function getSalesRecommendations(
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

  await verifyBusinessOwnership(businessId, req.user.email);

  const { data: recommendations, error } =
    await services.ai.generateSalesRecommendations(businessId);

  if (error) {
    throw new AppError(
      500,
      ErrorCodes.SERVER_ERROR,
      "Failed to generate recommendations"
    );
  }

  res.status(200).json(successResponse(recommendations));
}

/**
 * Get Stock Forecast
 * GET /api/v1/businesses/:businessId/ai/stock-forecast
 */
export async function getStockForecast(
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

  await verifyBusinessOwnership(businessId, req.user.email);

  const { data: forecast, error } = await services.ai.generateStockForecast(
    businessId
  );

  if (error) {
    throw new AppError(
      500,
      ErrorCodes.SERVER_ERROR,
      "Failed to generate stock forecast"
    );
  }

  res.status(200).json(successResponse(forecast));
}

/**
 * Ask AI Finance Assistant (Chatbot)
 * POST /api/v1/businesses/:businessId/ai/chat
 */
export async function chatWithAI(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      "User not authenticated"
    );
  }

  const businessId = parseInt(req.params.businessId);
  const { message, chatId } = req.body;

  if (isNaN(businessId)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Invalid business ID");
  }

  if (!message || typeof message !== "string") {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Message is required");
  }

  await verifyBusinessOwnership(businessId, req.user.email);

  const { data: user } = await repos.users.findByEmail(req.user.email);
  if (!user) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "User not found");
  }

  // Process AI chat with business context
  const { data: interaction, error } = await services.ai.processBusinessAIChat(
    user.id,
    businessId,
    message,
    chatId
  );

  if (error || !interaction) {
    throw new AppError(
      500,
      ErrorCodes.SERVER_ERROR,
      "Failed to process AI chat"
    );
  }

  res.status(200).json(successResponse(interaction));
}

/**
 * Get AI Chat History
 * GET /api/v1/businesses/:businessId/ai/chat/history
 */
export async function getChatHistory(
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
  const { limit } = req.query;

  if (isNaN(businessId)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, "Invalid business ID");
  }

  await verifyBusinessOwnership(businessId, req.user.email);

  const { data: user } = await repos.users.findByEmail(req.user.email);
  if (!user) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "User not found");
  }

  const messageLimit = limit ? parseInt(limit as string) : 50;

  const { data: history, error } = await services.ai.getChatHistory(
    user.id,
    messageLimit
  );

  if (error) {
    throw new AppError(
      500,
      ErrorCodes.SERVER_ERROR,
      "Failed to fetch chat history"
    );
  }

  res.status(200).json(successResponse(history));
}

/**
 * Get All Chat Sessions
 * GET /api/v1/businesses/:businessId/ai/chats
 */
export async function getAllChats(req: Request, res: Response): Promise<void> {
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

  await verifyBusinessOwnership(businessId, req.user.email);

  const { data: user } = await repos.users.findByEmail(req.user.email);
  if (!user) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "User not found");
  }

  const { data: chats, error } = await repos.chats.findByUserId(user.id);

  if (error) {
    throw new AppError(500, ErrorCodes.SERVER_ERROR, "Failed to fetch chats");
  }

  res.status(200).json(successResponse(chats || []));
}

/**
 * Get Specific Chat with Messages
 * GET /api/v1/businesses/:businessId/ai/chats/:chatId
 */
export async function getChatById(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      "User not authenticated"
    );
  }

  const businessId = parseInt(req.params.businessId);
  const chatId = parseInt(req.params.chatId);

  if (isNaN(businessId) || isNaN(chatId)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid business or chat ID"
    );
  }

  await verifyBusinessOwnership(businessId, req.user.email);

  const { data: user } = await repos.users.findByEmail(req.user.email);
  if (!user) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "User not found");
  }

  // Verify chat belongs to user
  const { data: chat } = await repos.chats.findByIdAndUserId(chatId, user.id);
  if (!chat) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, "Chat not found");
  }

  // Get messages for this chat
  const { data: messages, error } = await repos.messages.findByChatId(chatId);

  if (error) {
    throw new AppError(
      500,
      ErrorCodes.SERVER_ERROR,
      "Failed to fetch chat messages"
    );
  }

  res.status(200).json(
    successResponse({
      chat,
      messages: messages || [],
    })
  );
}
