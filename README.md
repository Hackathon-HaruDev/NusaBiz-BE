# NusaBiz: Financial Management Platform with AI

> **Empowering Business Owners with Smart Financial Management and AI-Driven Insights**

NusaBiz is a comprehensive web-based financial management platform designed to help business owners efficiently manage their finances, track inventory, and maximize business performance through AI-powered analytics and recommendations.

---

## � Table of Contents

- [Project Overview](#-project-overview)
- [Core Features](#-core-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Usage Examples](#-usage-examples)
- [Contributing](#-contributing)

---

## 🎯 Project Overview

### Purpose

NusaBiz helps **business owners** (especially small to medium enterprises) to:
- Track financial transactions (income and expenses) efficiently
- Manage product inventory with smart stock alerts
- Analyze business performance with AI-powered insights
- Make data-driven decisions to optimize profitability

### Target Users

- **Primary:** Small business owners, entrepreneurs, MSMEs
- **Use Case:** Daily financial tracking, inventory management, business optimization

### Technology

Built as a **modern web platform** with:
- **Frontend:** React with TypeScript for type-safe UI development
- **Backend:** Supabase (PostgreSQL) for scalable data management
- **AI Integration:** Simulated AI assistant (ready for OpenAI/Gemini integration)

---

## ✨ Core Features

### 💰 Financial & Transactions

- **Dynamic Transaction Recording**
  - Record income (sales) with automatic product stock reduction
  - Record expenses (purchases) with automatic stock increment
  - Categorized transactions for better organization

- **Transaction History**
  - Complete transaction logs with filters
  - View detailed transaction information
  - Track transaction status (pending, complete, cancel)

- **Business Summary Dashboard**
  - Current balance overview
  - Revenue and expense tracking
  - Sales performance graphs
  - Income vs. Expense analysis

### 📦 Inventory Management

- **Product CRUD Operations**
  - Create, read, update, delete products
  - Set purchase price and selling price
  - Track current stock levels

- **Smart Stock Status**
  - **Automatic status updates** based on stock levels:
    - `active`: Stock ≥ 10 units
    - `low`: Stock < 10 units
    - `out`: Stock = 0 units
  - Low stock alerts and notifications

- **Stock Management**
  - Automatic stock updates on sales/purchases
  - Stock movement history
  - Stock validation before sales

### 🤖 AI & Business Analysis

- **AI Analysis Button**
  - One-click business performance analysis
  - Insights on income, expenses, and profitability

- **Business Evaluation**
  - AI-powered optimization recommendations
  - Identify cost-saving opportunities
  - Suggest pricing strategies

- **Chat-Based AI Assistant**
  - Interactive chat interface for queries
  - "What-if" scenario analysis
  - Strategic business advice
  - Answer questions about finances and inventory

### � Account Management

- **Authentication**
  - Secure login/register with JWT tokens
  - Token-based session management
  - Password protection

- **Settings**
  - User profile management
  - Business information updates
  - Security settings

---

## 🏗️ Architecture

NusaBiz follows a **layered architecture** for clean separation of concerns and maintainability:

```
┌─────────────────────────────────────────┐
│       PRESENTATION LAYER                │
│     (React Components - TSX)            │
│  - Dashboard, Products, Transactions    │
│  - AI Chat Interface, Settings          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         SERVICE LAYER                   │
│      (Business Logic)                   │
├─────────────────────────────────────────┤
│ • TransactionService                    │
│   - recordProductSale()                 │
│   - recordStockPurchase()               │
│   - Atomic operations with rollback     │
│                                         │
│ • ProductService                        │
│   - manageStockAndStatus()              │
│   - Auto stock status determination     │
│                                         │
│ • BusinessService                       │
│   - getBalanceSummary()                 │
│   - Dashboard analytics                 │
│                                         │
│ • AIService                             │
│   - processAIChatMessage()              │
│   - Business insights generation        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│       REPOSITORY LAYER                  │
│       (Data Access Only)                │
├─────────────────────────────────────────┤
│ • BaseRepository<T>                     │
│   - Generic CRUD operations             │
│   - Soft delete support                 │
│                                         │
│ • Specific Repositories:                │
│   - UserRepository                      │
│   - BusinessRepository                  │
│   - ProductRepository                   │
│   - TransactionRepository               │
│   - ChatRepository                      │
│   - MessageRepository                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         SUPABASE / POSTGRESQL           │
│         (Database Layer)                │
└─────────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. **Repository Layer** (Pure Data Access)
- **Responsibility:** Database operations ONLY (SELECT, INSERT, UPDATE, DELETE)
- **Features:**
  - `BaseRepository<T>`: Generic CRUD operations for all models
  - Specific repositories for complex queries (e.g., joins, aggregations)
  - Soft delete support (`deleted_at` timestamp)
  - Type-safe query results
- **Example:** `ProductRepository.updateStock(productId, newStock)` - Simple UPDATE query

#### 2. **Service Layer** (Business Logic)
- **Responsibility:** Complex business rules and orchestration
- **Key Features:**
  - **Atomic Transaction Orchestration**
    - Sale: Validate stock → Create transaction → Update stock → Update balance
    - Purchase: Create transaction → Update stock → Update balance
    - **Manual Rollback:** If any step fails, rollback all changes
  
  - **Stock Validation**
    - Check stock availability before sales
    - Prevent negative stock
  
  - **Automatic Stock Status Updates**
    - Auto-determine status based on stock level
    - `stock === 0` → `'out'`
    - `stock < 10` → `'low'`
    - `stock >= 10` → `'active'`

- **Example:**
  ```typescript
  // Service handles all business logic
  const { data } = await services.transaction.recordProductSale({
    businessId: 1,
    products: [{ productId: 1, quantity: 5, sellingPrice: 25000 }]
  });
  // Automatically: validates, creates transaction, updates stock, updates balance
  ```

#### 3. **Presentation Layer** (UI Components)
- React components for user interaction
- Calls Service Layer for complex operations
- Calls Repository Layer for simple queries
- Displays data and handles user input

---

## 🛠️ Tech Stack

### Frontend
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Real-time subscriptions
  - Row-level security
- **JWT Authentication** - Secure token-based auth

### AI & Analytics
- **AI Integration** - Simulated for MVP (ready for OpenAI/Gemini)
- **Rule-based responses** - Context-aware business suggestions

### Development
- **ESLint** - Code linting
- **TypeScript Compiler** - Type checking
- **Git** - Version control

---

## 📁 Project Structure

```
NusaBiz-BE/
├── src/
│   ├── models/               # Data models and DTOs
│   │   ├── user.model.ts
│   │   ├── business.model.ts
│   │   ├── product.model.ts
│   │   ├── transaction.model.ts
│   │   ├── chat.model.ts
│   │   ├── message.model.ts
│   │   └── index.ts         # Barrel export
│   │
│   ├── repositories/         # Data access layer
│   │   ├── base.repository.ts       # Generic CRUD
│   │   ├── user.repository.ts
│   │   ├── business.repository.ts
│   │   ├── product.repository.ts
│   │   ├── transaction.repository.ts
│   │   ├── chat.repository.ts
│   │   ├── message.repository.ts
│   │   └── index.ts         # Barrel export
│   │
│   ├── Services/             # Business logic layer
│   │   ├── base.service.ts
│   │   ├── transaction.service.ts   # Sale/purchase orchestration
│   │   ├── product.service.ts       # Stock management
│   │   ├── business.service.ts      # Analytics
│   │   ├── ai.service.ts            # AI chat
│   │   └── index.ts         # Barrel export + factory
│   │
│   ├── api/
│   │   └── supabase/
│   │       └── client.ts    # Supabase initialization
│   │
│   └── test-repository.ts   # Usage examples
│
├── .env.example             # Environment variables template
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies
└── README.md               # This file
```

### Key Directories

- **`models/`** - TypeScript interfaces for database tables and DTOs
- **`repositories/`** - Data access layer with pure database operations
- **`Services/`** - Business logic layer with orchestration and validation
- **`api/supabase/`** - Supabase client configuration and initialization

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### 1. Clone Repository

```bash
git clone <repository-url>
cd NusaBiz-BE
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Get your credentials:**
> 1. Go to [Supabase Dashboard](https://app.supabase.com)
> 2. Select your project
> 3. Go to Settings → API
> 4. Copy **Project URL** and **anon/public** key

### 4. Database Setup

Run migrations in Supabase SQL Editor to create tables:

```sql
-- Users table
CREATE TABLE "Users" (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  whatsapp_number TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Businesses table
CREATE TABLE "Businesses" (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "Users"(id),
  business_name TEXT NOT NULL,
  category TEXT,
  location TEXT,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Products table
CREATE TABLE "Products" (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES "Businesses"(id),
  name TEXT NOT NULL,
  current_stock INTEGER DEFAULT 0,
  purchase_price DECIMAL(15, 2),
  selling_price DECIMAL(15, 2),
  stock_status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Transactions table
CREATE TABLE "Transactions" (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES "Businesses"(id),
  transaction_date TIMESTAMP DEFAULT NOW(),
  type TEXT NOT NULL,
  category TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'complete',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- TransactionDetails table
CREATE TABLE "TransactionDetails" (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES "Transactions"(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES "Products"(id),
  quantity INTEGER NOT NULL,
  unit_price_at_transaction DECIMAL(15, 2) NOT NULL
);

-- Chats table
CREATE TABLE "Chats" (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "Users"(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Messages table
CREATE TABLE "Messages" (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES "Chats"(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Run Development Server

```bash
npm run dev
```

### 6. Build for Production

```bash
npm run build
```

---

## 💡 Usage Examples

### Initialize App

```typescript
import { initializeApp } from './api/supabase/client';

// Get both repositories and services
const { repos, services } = initializeApp();
```

### Record a Product Sale

```typescript
// Complex operation - use Service Layer
const { data, error } = await services.transaction.recordProductSale({
  businessId: 1,
  products: [
    { productId: 1, quantity: 5, sellingPrice: 25000 },
    { productId: 2, quantity: 3, sellingPrice: 15000 }
  ],
  description: 'Daily sales'
});

// Automatically handles:
// ✅ Stock validation
// ✅ Transaction creation
// ✅ Stock reduction
// ✅ Balance increment
// ✅ Rollback on failure
```

### Get Business Summary

```typescript
const { data: summary } = await services.business.getBalanceSummary(businessId);

console.log(`Total Income: Rp ${summary.totalIncome}`);
console.log(`Total Expense: Rp ${summary.totalExpense}`);
console.log(`Net Profit: Rp ${summary.netProfit}`);
```

### AI Chat Interaction

```typescript
const { data } = await services.ai.processAIChatMessage(
  userId,
  "Bagaimana cara meningkatkan penjualan saya?"
);

console.log('Bot:', data.botResponse.content);
```

### Simple Queries - Use Repository Directly

```typescript
// For simple data fetching, use repositories
const { data: products } = await repos.products.findByBusinessId(businessId);
const { data: user } = await repos.users.findById(userId);
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 👨‍💻 Authors

**NusaBiz Development Team**

---

## 🙏 Acknowledgments

- Built with [Supabase](https://supabase.com)
- Powered by [React](https://react.dev)
- Type-safe with [TypeScript](https://www.typescriptlang.org)

---

**Happy Building! 🚀**
