/**
 * AI Service
 * Handles AI chat interactions (simulated for MVP)
 */

import { BaseService } from "./base.service";
import type { Chat } from "../models/chat.model";
import type { Message } from "../models/message.model";

export interface ChatInteraction {
  chat: Chat;
  userMessage: Message;
  botResponse: Message;
}

export class AIService extends BaseService {
  /**
   * Process AI chat message
   * - Gets or creates chat for user
   * - Saves user message
   * - Generates AI response (simulated for MVP)
   * - Saves bot response
   * Returns complete interaction
   */
  async processAIChatMessage(
    userId: string,
    message: string,
    existingChatId?: number
  ): Promise<{ data: ChatInteraction | null; error: any }> {
    try {
      let chat: Chat;
      let isNewChat = false;
      let finalMessage = message;

      if (existingChatId) {
        // Skenario 1: Melanjutkan sesi chat yang sudah ada
        const { data: foundChat } = await this.repos.chats.findByIdAndUserId(
          existingChatId,
          userId
        );
        if (!foundChat) throw new Error("Chat not found or access denied.");
        chat = foundChat;
      } else {
        // Skenario 2: Membuat chat baru (dipicu oleh 'New Chat')
        const { data: newChat, error: chatError } =
          await this.repos.chats.createNewChat(userId);
        if (chatError || !newChat)
          throw new Error("Failed to create new chat.");
        chat = newChat;
        isNewChat = true;

        // ⭐️ LOGIKA KONTEKS HANYA UNTUK CHAT BARU ⭐️
        const businessContext = await this.generateBusinessContext(userId);
        finalMessage = `${businessContext}\n\n[PESAN PENGGUNA]\n${message}`;
      }

      // Step 2: Save user message
      const { data: userMessage, error: userMessageError } =
        await this.repos.messages.createUserMessage(chat.id, message);

      if (userMessageError || !userMessage) {
        return {
          data: null,
          error: userMessageError || new Error("Failed to save user message"),
        };
      }

      // Step 3: Generate AI response using Kolosal AI
      const aiResponse = await this.callKolosalAI(finalMessage);

      // Step 4: Save bot response
      const { data: botMessage, error: botMessageError } =
        await this.repos.messages.createBotMessage(chat.id, aiResponse);

      if (botMessageError || !botMessage) {
        return {
          data: null,
          error: botMessageError || new Error("Failed to save bot message"),
        };
      }

      // Step 5: Return complete interaction
      const interaction: ChatInteraction = {
        chat,
        userMessage,
        botResponse: botMessage,
      };

      return { data: interaction, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Call Kolosal AI API for chat completion
   * @param userMessage The message from the user
   * @returns AI-generated response or error message
   */
  private async callKolosalAI(userMessage: string): Promise<string> {
    try {
      const response = await fetch(
        "https://api.kolosal.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.VITE_KOLOSAL_API}`,
          },
          body: JSON.stringify({
            max_tokens: 1000,
            messages: [
              {
                content: userMessage,
                role: "user",
              },
            ],
            model: "meta-llama/llama-4-maverick-17b-128e-instruct",
          }),
        }
      );

      if (!response.ok) {
        console.error(
          `Kolosal AI API error: ${response.status} ${response.statusText}`
        );
        throw new Error(`Kolosal AI API error: ${response.status}`);
      }

      const data = await response.json();

      // Extract AI response from choices array
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }

      throw new Error("No response from AI");
    } catch (error) {
      console.error("Kolosal AI Error:", error);
      return "Maaf, AI sedang mengalami gangguan teknis.";
    }
  }

  /**
   * Get chat history for a user
   */
  async getChatHistory(
    userId: string,
    messageLimit?: number
  ): Promise<{ data: { chat: Chat; messages: Message[] } | null; error: any }> {
    try {
      const { data: chat, error: chatError } =
        await this.repos.chats.findLatestChat(userId);

      if (chatError || !chat) {
        // Jika tidak ada chat, kembalikan data kosong, bukan error
        return {
          data: { chat: undefined as unknown as Chat, messages: [] },
          error: null,
        };
      }

      const { data: messages, error: messagesError } =
        await this.repos.messages.findByChatId(chat.id, messageLimit);

      if (messagesError) {
        return { data: null, error: messagesError };
      }

      return {
        data: {
          chat,
          messages: messages || [],
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  }

  private async generateBusinessContext(userId: string): Promise<string> {
    try {
      const contextParts: string[] = [];

      // 1. Ambil Data Bisnis Utama
      const { data: businesses } = await this.repos.businesses.findAll({
        user_id: userId,
      });
      if (businesses?.length) {
        contextParts.push("Data Bisnis Anda:");
        businesses.forEach((b) => {
          contextParts.push(
            `- Nama: ${b.business_name}, Kategori: ${b.category}, Saldo: ${b.current_balance}`
          );
        });

        // Asumsi: Kita hanya menggunakan bisnis pertama untuk detail lainnya
        const primaryBusinessId = businesses[0].id;

        // 2. Ambil Produk
        const { data: products } = await this.repos.products.findAll(
          { business_id: primaryBusinessId },
          { limit: 5 }
        );
        if (products?.length) {
          contextParts.push("\nProduk Terakhir/Populer (Max 5):");
          products.forEach((p) => {
            contextParts.push(
              `- ${p.name}, Stok: ${p.current_stock}, Harga Jual: ${p.selling_price}`
            );
          });
        }

        // 3. Ambil Ringkasan Transaksi (Total Income/Expense)
        const { data: totals } = await this.repos.transactions.getTotalsByType(
          primaryBusinessId
        );
        if (totals) {
          contextParts.push("\nRingkasan Keuangan (Semua Waktu):");
          contextParts.push(
            `- Total Pendapatan: ${totals.income}, Total Pengeluaran: ${
              totals.expense
            }, Keuntungan Bersih: ${totals.income - totals.expense}`
          );
        }
      } else {
        contextParts.push("Tidak ditemukan data bisnis yang terdaftar.");
      }

      return `[KONTEKS DATA BISNIS PENGGUNA]\n${contextParts.join(
        "\n"
      )}\n[/KONTEKS DATA BISNIS PENGGUNA]`;
    } catch (error) {
      console.error("Failed to generate AI context:", error);
      return "[KONTEKS DATA BISNIS PENGGUNA] Gagal memuat data bisnis. [KONTEKS DATA BISNIS PENGGUNA]";
    }
  }

  /**
   * Generate Business Insights
   * Analyzes transactions and provides automatic insights
   */
  async generateBusinessInsights(
    businessId: number
  ): Promise<{ data: any; error: any }> {
    try {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get transactions for analysis
      const { data: weekTransactions } =
        await this.repos.transactions.findByBusinessId(businessId, {
          dateRange: {
            startDate: lastWeek.toISOString(),
            endDate: now.toISOString(),
          },
        });

      const { data: monthTransactions } =
        await this.repos.transactions.findByBusinessId(businessId, {
          dateRange: {
            startDate: lastMonth.toISOString(),
            endDate: now.toISOString(),
          },
        });

      // Get products for analysis
      const { data: products } = await this.repos.products.findAll({
        business_id: businessId,
      });

      // Analyze categories
      const categoryAnalysis = this.analyzeCategoryTrends(
        weekTransactions || [],
        monthTransactions || []
      );

      // Analyze products
      const productAnalysis = this.analyzeProductContribution(
        weekTransactions || [],
        products || []
      );

      // Analyze profit margin
      const marginAnalysis = this.analyzeProfitMargin(
        weekTransactions || [],
        monthTransactions || []
      );

      const insights = {
        categoryInsights: categoryAnalysis,
        productInsights: productAnalysis,
        marginInsights: marginAnalysis,
        generatedAt: now.toISOString(),
      };

      return { data: insights, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Generate Cashflow Forecast
   * Predicts income and expenses for the next N days
   */
  async generateCashflowForecast(
    businessId: number,
    days: number
  ): Promise<{ data: any; error: any }> {
    try {
      const now = new Date();
      const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get historical data
      const { data: transactions } =
        await this.repos.transactions.findByBusinessId(businessId, {
          dateRange: {
            startDate: past30Days.toISOString(),
            endDate: now.toISOString(),
          },
        });

      const { data: business } = await this.repos.businesses.findById(
        businessId
      );

      if (!transactions || !business) {
        throw new Error("Insufficient data for forecast");
      }

      // Calculate daily averages
      const incomeTransactions = transactions.filter(
        (t) => t.type === "Income"
      );
      const expenseTransactions = transactions.filter(
        (t) => t.type === "Expense"
      );

      const avgDailyIncome =
        incomeTransactions.reduce((sum, t) => sum + t.amount, 0) / 30;
      const avgDailyExpense =
        expenseTransactions.reduce((sum, t) => sum + t.amount, 0) / 30;

      // Generate forecast
      const forecast = [];
      let projectedBalance = business.current_balance;

      for (let i = 1; i <= days; i++) {
        const forecastDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const projectedIncome = avgDailyIncome;
        const projectedExpense = avgDailyExpense;
        projectedBalance += projectedIncome - projectedExpense;

        forecast.push({
          date: forecastDate.toISOString().split("T")[0],
          projectedIncome: Math.round(projectedIncome),
          projectedExpense: Math.round(projectedExpense),
          projectedBalance: Math.round(projectedBalance),
          warning: projectedBalance < 0 ? "Potensi cashflow minus" : null,
        });
      }

      const endBalance = forecast[forecast.length - 1].projectedBalance;
      const warnings = forecast.filter((f) => f.warning).map((f) => f.date);

      return {
        data: {
          currentBalance: business.current_balance,
          projectedEndBalance: endBalance,
          forecast,
          warnings:
            warnings.length > 0
              ? `Ada potensi cashflow minus pada tanggal: ${warnings.join(
                  ", "
                )}`
              : null,
          summary: `Prediksi saldo ${days} hari ke depan: Rp ${endBalance.toLocaleString(
            "id-ID"
          )}`,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Generate Cost Saving Recommendations
   */
  async generateCostRecommendations(
    businessId: number
  ): Promise<{ data: any; error: any }> {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { data: transactions } =
        await this.repos.transactions.findByBusinessId(businessId, {
          type: "Expense",
          dateRange: {
            startDate: lastMonth.toISOString(),
            endDate: now.toISOString(),
          },
        });

      if (!transactions || transactions.length === 0) {
        return {
          data: {
            recommendations: [],
            message: "Tidak cukup data pengeluaran untuk analisis",
          },
          error: null,
        };
      }

      // Group by category
      const categoryExpenses: { [key: string]: number } = {};
      transactions.forEach((t) => {
        const category = t.category || "Lainnya";
        categoryExpenses[category] =
          (categoryExpenses[category] || 0) + t.amount;
      });

      // Find high-spending categories
      const totalExpense = Object.values(categoryExpenses).reduce(
        (sum, val) => sum + val,
        0
      );
      const recommendations: any[] = [];

      for (const [category, amount] of Object.entries(categoryExpenses)) {
        const percentage = (amount / totalExpense) * 100;

        if (percentage > 20) {
          recommendations.push({
            category,
            amount,
            percentage: Math.round(percentage),
            suggestion: `Kategori ${category} menghabiskan ${Math.round(
              percentage
            )}% dari total pengeluaran (Rp ${amount.toLocaleString(
              "id-ID"
            )}). Pertimbangkan untuk mengoptimalkan pengeluaran di kategori ini.`,
            priority: "high",
          });
        } else if (percentage > 10) {
          recommendations.push({
            category,
            amount,
            percentage: Math.round(percentage),
            suggestion: `Pengeluaran kategori ${category} cukup signifikan (${Math.round(
              percentage
            )}%). Bisa dikaji ulang untuk efisiensi.`,
            priority: "medium",
          });
        }
      }

      // Check for "Lainnya" category
      if (
        categoryExpenses["Lainnya"] &&
        categoryExpenses["Lainnya"] > totalExpense * 0.15
      ) {
        recommendations.push({
          category: "Lainnya",
          amount: categoryExpenses["Lainnya"],
          percentage: Math.round(
            (categoryExpenses["Lainnya"] / totalExpense) * 100
          ),
          suggestion:
            'Anda memiliki banyak pengeluaran di kategori "Lainnya". Pertimbangkan untuk mengkategorikan lebih spesifik agar lebih mudah dianalisis.',
          priority: "medium",
        });
      }

      return { data: { recommendations, totalExpense }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Generate Sales Recommendations
   */
  async generateSalesRecommendations(
    businessId: number
  ): Promise<{ data: any; error: any }> {
    try {
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get all products
      const { data: products } = await this.repos.products.findAll({
        business_id: businessId,
      });

      // Get transactions with product details
      const { data: transactions } =
        await this.repos.transactions.findByBusinessId(businessId, {
          type: "Income",
          dateRange: {
            startDate: last30Days.toISOString(),
            endDate: now.toISOString(),
          },
        });

      if (!products || products.length === 0) {
        return {
          data: {
            recommendations: [],
            message: "Tidak ada data produk untuk analisis",
          },
          error: null,
        };
      }

      const recommendations: any[] = [];

      // Analyze product performance
      const productSales: { [key: number]: number } = {};

      // Calculate sales per product (simplified - in real scenario, use transaction_products)
      products.forEach((product) => {
        const margin =
          (product.selling_price || 0) - (product.purchase_price || 0);
        const marginPercentage = product.purchase_price
          ? (margin / product.purchase_price) * 100
          : 0;

        // Low stock warning
        if (product.current_stock < 10) {
          recommendations.push({
            type: "stock_warning",
            productName: product.name,
            currentStock: product.current_stock,
            suggestion: `Stok ${product.name} tinggal ${product.current_stock}. Pertimbangkan untuk restock segera.`,
            priority: "high",
          });
        }

        // High margin products
        if (marginPercentage > 50 && product.current_stock > 20) {
          recommendations.push({
            type: "promotion_opportunity",
            productName: product.name,
            margin: Math.round(marginPercentage),
            suggestion: `${
              product.name
            } memiliki margin keuntungan ${Math.round(
              marginPercentage
            )}% dan stok cukup. Produk ini cocok untuk dipromosikan.`,
            priority: "medium",
          });
        }

        // Slow-moving products
        if (product.current_stock > 50) {
          recommendations.push({
            type: "slow_moving",
            productName: product.name,
            currentStock: product.current_stock,
            suggestion: `${product.name} memiliki stok tinggi (${product.current_stock}). Pertimbangkan promo atau diskon untuk mempercepat penjualan.`,
            priority: "low",
          });
        }
      });

      return { data: { recommendations }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Generate Stock Forecast
   */
  async generateStockForecast(
    businessId: number
  ): Promise<{ data: any; error: any }> {
    try {
      const { data: products } = await this.repos.products.findAll({
        business_id: businessId,
      });

      if (!products || products.length === 0) {
        return {
          data: {
            forecasts: [],
            message: "Tidak ada data produk",
          },
          error: null,
        };
      }

      // Simple forecast based on current stock and average daily sales
      // In production, this would use historical transaction data
      const forecasts = products.map((product) => {
        const estimatedDailySales = 2; // Simplified - should calculate from actual sales
        const daysUntilEmpty = product.current_stock / estimatedDailySales;
        const restockDate = new Date(
          Date.now() + daysUntilEmpty * 24 * 60 * 60 * 1000
        );

        return {
          productName: product.name,
          currentStock: product.current_stock,
          estimatedDailySales,
          daysUntilEmpty: Math.round(daysUntilEmpty),
          estimatedEmptyDate: restockDate.toISOString().split("T")[0],
          recommendedRestockQuantity: Math.ceil(estimatedDailySales * 30), // 30 days supply
          priority:
            daysUntilEmpty < 7
              ? "urgent"
              : daysUntilEmpty < 14
              ? "soon"
              : "normal",
        };
      });

      return { data: { forecasts }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Process Business AI Chat
   * Enhanced chat with business-specific context
   */
  async processBusinessAIChat(
    userId: string,
    businessId: number,
    message: string,
    existingChatId?: number
  ): Promise<{ data: ChatInteraction | null; error: any }> {
    try {
      let chat: Chat;
      let finalMessage = message;

      if (existingChatId) {
        const { data: foundChat } = await this.repos.chats.findByIdAndUserId(
          existingChatId,
          userId
        );
        if (!foundChat) throw new Error("Chat not found or access denied.");
        chat = foundChat;
      } else {
        const { data: newChat, error: chatError } =
          await this.repos.chats.createNewChat(userId);
        if (chatError || !newChat)
          throw new Error("Failed to create new chat.");
        chat = newChat;

        // Add business context for new chat
        const businessContext = await this.generateDetailedBusinessContext(
          businessId
        );
        finalMessage = `${businessContext}\n\n[PESAN PENGGUNA]\n${message}`;
      }

      // Save user message
      const { data: userMessage, error: userMessageError } =
        await this.repos.messages.createUserMessage(chat.id, message);

      if (userMessageError || !userMessage) {
        return {
          data: null,
          error: userMessageError || new Error("Failed to save user message"),
        };
      }

      // Generate AI response
      const aiResponse = await this.callKolosalAI(finalMessage);

      // Save bot response
      const { data: botMessage, error: botMessageError } =
        await this.repos.messages.createBotMessage(chat.id, aiResponse);

      if (botMessageError || !botMessage) {
        return {
          data: null,
          error: botMessageError || new Error("Failed to save bot message"),
        };
      }

      const interaction: ChatInteraction = {
        chat,
        userMessage,
        botResponse: botMessage,
      };

      return { data: interaction, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Generate detailed business context for AI
   */
  private async generateDetailedBusinessContext(
    businessId: number
  ): Promise<string> {
    try {
      const contextParts: string[] = [];
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Business info
      const { data: business } = await this.repos.businesses.findById(
        businessId
      );
      if (business) {
        contextParts.push(`[INFORMASI BISNIS]`);
        contextParts.push(`Nama: ${business.business_name}`);
        contextParts.push(`Kategori: ${business.category}`);
        contextParts.push(
          `Saldo Saat Ini: Rp ${business.current_balance.toLocaleString(
            "id-ID"
          )}`
        );
      }

      // Products
      const { data: products } = await this.repos.products.findAll({
        business_id: businessId,
      });
      if (products && products.length > 0) {
        contextParts.push(`\n[PRODUK (${products.length} total)]`);
        products.slice(0, 10).forEach((p) => {
          contextParts.push(
            `- ${p.name}: Stok ${p.current_stock}, Harga Jual Rp ${(
              p.selling_price || 0
            ).toLocaleString("id-ID")}`
          );
        });
      }

      // Financial summary
      const { data: totals } = await this.repos.transactions.getTotalsByType(
        businessId,
        {
          startDate: lastMonth.toISOString(),
          endDate: now.toISOString(),
        }
      );

      if (totals) {
        contextParts.push(`\n[RINGKASAN KEUANGAN 30 HARI TERAKHIR]`);
        contextParts.push(
          `Total Pendapatan: Rp ${totals.income.toLocaleString("id-ID")}`
        );
        contextParts.push(
          `Total Pengeluaran: Rp ${totals.expense.toLocaleString("id-ID")}`
        );
        contextParts.push(
          `Keuntungan Bersih: Rp ${(
            totals.income - totals.expense
          ).toLocaleString("id-ID")}`
        );
      }

      contextParts.push(`\n[INSTRUKSI]`);
      contextParts.push(
        `Anda adalah asisten keuangan AI untuk bisnis UMKM. Berikan jawaban yang spesifik, actionable, dan dalam Bahasa Indonesia. Gunakan data di atas untuk memberikan insight yang relevan.`
      );

      return contextParts.join("\n");
    } catch (error) {
      console.error("Failed to generate detailed business context:", error);
      return "[KONTEKS] Gagal memuat data bisnis lengkap.";
    }
  }

  // Helper methods for analysis
  private analyzeCategoryTrends(weekData: any[], monthData: any[]) {
    const weekExpenses: { [key: string]: number } = {};
    const monthExpenses: { [key: string]: number } = {};

    weekData
      .filter((t) => t.type === "Expense")
      .forEach((t) => {
        const cat = t.category || "Lainnya";
        weekExpenses[cat] = (weekExpenses[cat] || 0) + t.amount;
      });

    monthData
      .filter((t) => t.type === "Expense")
      .forEach((t) => {
        const cat = t.category || "Lainnya";
        monthExpenses[cat] = (monthExpenses[cat] || 0) + t.amount;
      });

    const insights = [];
    for (const [category, weekAmount] of Object.entries(weekExpenses)) {
      const monthAmount = monthExpenses[category] || 0;
      const weeklyAvg = monthAmount / 4;

      if (weekAmount > weeklyAvg * 1.2) {
        const increase = Math.round(
          ((weekAmount - weeklyAvg) / weeklyAvg) * 100
        );
        insights.push({
          category,
          trend: "increase",
          percentage: increase,
          message: `Kategori ${category} meningkat ${increase}% minggu ini`,
        });
      }
    }

    return insights;
  }

  private analyzeProductContribution(transactions: any[], products: any[]) {
    // Simplified - in production, analyze transaction_products table
    const totalIncome = transactions
      .filter((t) => t.type === "Income")
      .reduce((sum, t) => sum + t.amount, 0);

    return products.slice(0, 3).map((p) => ({
      productName: p.name,
      contribution: "N/A", // Would calculate from actual sales data
      message: `Produk ${p.name} tersedia dengan stok ${p.current_stock}`,
    }));
  }

  private analyzeProfitMargin(weekData: any[], monthData: any[]) {
    const weekIncome = weekData
      .filter((t) => t.type === "Income")
      .reduce((sum, t) => sum + t.amount, 0);
    const weekExpense = weekData
      .filter((t) => t.type === "Expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const weekMargin =
      weekIncome > 0 ? ((weekIncome - weekExpense) / weekIncome) * 100 : 0;

    const monthIncome = monthData
      .filter((t) => t.type === "Income")
      .reduce((sum, t) => sum + t.amount, 0);
    const monthExpense = monthData
      .filter((t) => t.type === "Expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const monthMargin =
      monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;

    const avgMonthlyMargin = monthMargin / 4;
    const change = weekMargin - avgMonthlyMargin;

    return {
      currentMargin: Math.round(weekMargin),
      change: Math.round(change),
      message:
        change < -5
          ? `Margin laba turun ${Math.abs(
              Math.round(change)
            )}%, kemungkinan karena biaya meningkat`
          : change > 5
          ? `Margin laba meningkat ${Math.round(change)}%, performa bagus!`
          : "Margin laba stabil",
    };
  }
}
