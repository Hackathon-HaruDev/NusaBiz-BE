# NusaBiz API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000/api/v1`  
**Last Updated:** December 5, 2024

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Error Codes](#error-codes)
5. [API Endpoints](#api-endpoints)
   - [Health Check](#health-check)
   - [Authentication](#authentication-endpoints)
   - [User Management](#user-management)
   - [Business Management](#business-management)
   - [Product Management](#product-management)
   - [Transaction Management](#transaction-management)
   - [AI Chat](#ai-chat)

---

## Overview

NusaBiz API adalah RESTful API untuk platform manajemen keuangan bisnis dengan fitur AI. API ini menyediakan endpoint untuk manajemen pengguna, bisnis, produk, transaksi, dan interaksi dengan AI assistant.

### Key Features
- 🔐 Autentikasi menggunakan Supabase Auth (JWT)
- 💼 Manajemen bisnis dan inventory
- 💰 Pencatatan transaksi otomatis dengan update stok
- 🤖 AI Assistant untuk analisis bisnis
- 📊 Analytics dan reporting
- ✅ Type-safe dengan TypeScript

---

## Authentication

Sebagian besar endpoint memerlukan autentikasi. Gunakan JWT token yang didapat dari endpoint `/auth/login` atau `/auth/register`.

### Format Header
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration
- Access Token: 24 jam
- Refresh Token: 30 hari

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { }
  }
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request berhasil |
| 201 | Created | Resource berhasil dibuat |
| 400 | Bad Request | Request tidak valid |
| 401 | Unauthorized | Token tidak valid atau expired |
| 403 | Forbidden | Tidak memiliki akses ke resource |
| 404 | Not Found | Resource tidak ditemukan |
| 409 | Conflict | Konflik data (misal: email sudah terdaftar) |
| 500 | Internal Server Error | Error server |

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation gagal |
| `AUTHENTICATION_REQUIRED` | Token tidak valid atau expired |
| `UNAUTHORIZED` | Tidak memiliki akses |
| `NOT_FOUND` | Resource tidak ditemukan |
| `DUPLICATE_ENTRY` | Data duplikat (misal: email) |
| `INSUFFICIENT_STOCK` | Stok tidak cukup |
| `BUSINESS_LOGIC_ERROR` | Error business logic |
| `SERVER_ERROR` | Error internal server |

---

## API Endpoints

### Health Check

Endpoint untuk mengecek status server.

#### GET /health

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-12-03T12:00:00.000Z",
    "service": "NusaBiz API",
    "version": "1.0.0"
  }
}
```

---

## Authentication Endpoints

### 1. Register User

Mendaftarkan user baru dengan Supabase Auth.

#### POST /auth/register

**Request Body:**
```json
{
  "email": "johndoe@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "whatsapp_number": "+628123456789"
}
```

**Validation Rules:**
- `email`: Required, format email valid
- `password`: Required, minimal 8 karakter, harus ada huruf dan angka
- `full_name`: Optional
- `whatsapp_number`: Optional

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "johndoe@example.com",
      "full_name": "John Doe",
      "whatsapp_number": "+628123456789",
      "created_at": "2024-12-03T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG5kb2VAZXhhbXBsZS5jb20iLCJpYXQiOjE3MDE2MDAwMDAsImV4cCI6MTcwMTY4NjQwMH0.abcdefghijk123456789"
  },
  "message": "Registration successful"
}
```

**Error Responses:**

`400 Bad Request` - Invalid email format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format"
  }
}
```

`400 Bad Request` - Weak password
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must be at least 8 characters with letters and numbers"
  }
}
```

`409 Conflict` - Email already registered
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_ENTRY",
    "message": "Email already registered"
  }
}
```

---

### 2. Login User

Login dan mendapatkan JWT token.

#### POST /auth/login

**Request Body:**
```json
{
  "email": "johndoe@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "johndoe@example.com",
      "full_name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  },
  "message": "Login successful"
}
```

**Error Responses:**

`401 Unauthorized` - Invalid credentials
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Invalid credentials"
  }
}
```

`400 Bad Request` - Missing fields
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email and password are required"
  }
}
```

---

### 3. Logout User

Logout dan invalidate token.

#### POST /auth/logout

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": null,
  "message": "Logout successful"
}
```

**Error Responses:**

`401 Unauthorized` - Invalid token
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authorization token required"
  }
}
```

---

### 4. Refresh Token

Mendapatkan access token baru menggunakan refresh token.

#### POST /auth/refresh

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

**Error Responses:**

`401 Unauthorized` - Invalid refresh token
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Invalid refresh token"
  }
}
```

---

## User Management

🔒 **Semua endpoint memerlukan authentication**

### 5. Get Current User Profile

Mendapatkan profil user yang sedang login.

#### GET /users/me

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "johndoe@example.com",
    "full_name": "John Doe",
    "whatsapp_number": "+628123456789",
    "created_at": "2024-12-03T10:30:00Z",
    "updated_at": "2024-12-03T10:30:00Z"
  }
}
```

---

### 6. Update User Profile

Update informasi profil user dan upload avatar (opsional).

#### PUT /users/me

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body (Multipart Form Data):**
- `full_name` (string, optional) - Nama lengkap user
- `whatsapp_number` (string, optional) - Nomor WhatsApp
- `avatar` (file, optional) - File gambar untuk avatar (jpg, jpeg, png, max 2MB)

**Example cURL:**
```bash
# Update profile dengan avatar
curl -X PUT http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer {token}" \
  -F "avatar=@/path/to/image.jpg" \
  -F "full_name=John Smith" \
  -F "whatsapp_number=+628987654321"

# Update profile tanpa avatar (JSON biasa juga tetap bisa)
curl -X PUT http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"John Smith","whatsapp_number":"+628987654321"}'
```

**Avatar Upload Logic:**
- File akan di-upload ke Supabase Storage bucket `user-image`
- Avatar lama akan otomatis dihapus (kecuali default avatar)
- Jika upload gagal, perubahan akan di-rollback
- Public URL avatar akan disimpan di database field `Users.image`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "johndoe@example.com",
    "full_name": "John Smith",
    "whatsapp_number": "+628987654321",
    "image": "https://puxrvmtzptuukbisgbnn.supabase.co/storage/v1/object/public/user-image/user_550e8400_1701600000.jpg",
    "updated_at": "2024-12-05T14:20:00Z"
  },
  "message": "Profile updated successfully"
}
```

**Error Responses:**

`400 Bad Request` - Invalid file type
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Only JPG, JPEG, and PNG files are allowed"
  }
}
```

`400 Bad Request` - File too large
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "File too large"
  }
}
```

`500 Server Error` - Upload failed
```json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "Failed to upload avatar"
  }
}
```

---

### 7. Change Password

Mengganti password user.

#### PUT /users/me/password

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": null,
  "message": "Password changed successfully"
}
```

**Error Responses:**

`401 Unauthorized` - Current password incorrect
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Current password is incorrect"
  }
}
```

`400 Bad Request` - Weak new password
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "New password must be at least 8 characters with letters and numbers"
  }
}
```

---

### 8. Delete Account

Soft delete akun user.

#### DELETE /users/me

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": null,
  "message": "Account deletion initiated"
}
```

---

## Business Management

🔒 **Semua endpoint memerlukan authentication**

### 9. Create Business

Membuat bisnis baru untuk user yang sedang login.

#### POST /businesses

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "business_name": "Toko Sembako Makmur",
  "category": "Retail",
  "location": "Jakarta Selatan",
  "current_balance": 5000000
}
```

**Validation Rules:**
- `business_name`: Required, non-empty string
- `category`: Optional
- `location`: Optional
- `current_balance`: Optional, non-negative number (default: 0)

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "business_name": "Toko Sembako Makmur",
    "category": "Retail",
    "location": "Jakarta Selatan",
    "current_balance": 5000000,
    "created_at": "2024-12-03T10:30:00Z",
    "updated_at": "2024-12-03T10:30:00Z",
    "deleted_at": null
  },
  "message": "Business created successfully"
}
```

**Error Responses:**

`400 Bad Request` - Invalid balance
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Current balance must be a non-negative number"
  }
}
```

---

### 10. Get All Businesses

Mendapatkan semua bisnis milik user yang sedang login.

#### GET /businesses

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "business_name": "Toko Sembako Makmur",
      "category": "Retail",
      "location": "Jakarta Selatan",
      "current_balance": 5000000,
      "created_at": "2024-12-03T10:30:00Z",
      "updated_at": "2024-12-03T10:30:00Z",
      "deleted_at": null
    },
    {
      "id": 2,
      "user_id": 1,
      "business_name": "Warung Kopi",
      "category": "Food & Beverage",
      "location": "Jakarta Pusat",
      "current_balance": 2000000,
      "created_at": "2024-12-02T08:00:00Z",
      "updated_at": "2024-12-02T08:00:00Z",
      "deleted_at": null
    }
  ]
}
```

---

### 11. Get Business by ID

Mendapatkan detail bisnis tertentu.

#### GET /businesses/:businessId

**Headers:**
```
Authorization: Bearer {token}
```

**URL Parameters:**
- `businessId` (integer) - ID bisnis

**Example:** `GET /businesses/1`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "business_name": "Toko Sembako Makmur",
    "category": "Retail",
    "location": "Jakarta Selatan",
    "current_balance": 5000000,
    "created_at": "2024-12-03T10:30:00Z",
    "updated_at": "2024-12-03T10:30:00Z",
    "deleted_at": null
  }
}
```

**Error Responses:**

`404 Not Found` - Business not found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Business not found"
  }
}
```

`403 Forbidden` - Not authorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Not authorized to access this business"
  }
}
```

---

### 12. Update Business

Update informasi bisnis.

#### PUT /businesses/:businessId

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "business_name": "Toko Sembako Makmur Jaya",
  "category": "Retail & Wholesale",
  "location": "Jakarta Pusat"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "business_name": "Toko Sembako Makmur Jaya",
    "category": "Retail & Wholesale",
    "location": "Jakarta Pusat",
    "current_balance": 5000000,
    "created_at": "2024-12-03T10:30:00Z",
    "updated_at": "2024-12-03T14:20:00Z",
    "deleted_at": null
  },
  "message": "Business updated successfully"
}
```

---

### 13. Delete Business

Soft delete bisnis.

#### DELETE /businesses/:businessId

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": null,
  "message": "Business deleted successfully"
}
```

---

### 14. Get Business Overview

Mendapatkan ringkasan statistik bisnis.

#### GET /businesses/:businessId/overview

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "business": {
      "id": 1,
      "user_id": 1,
      "business_name": "Toko Sembako Makmur",
      "category": "Retail",
      "location": "Jakarta Selatan",
      "current_balance": 5000000,
      "created_at": "2024-12-03T10:30:00Z",
      "updated_at": "2024-12-03T10:30:00Z",
      "deleted_at": null
    },
    "productCount": 45,
    "transactionCount": 128,
    "lowStockCount": 7
  }
}
```

---

### 15. Get Balance Summary

Mendapatkan ringkasan keuangan bisnis.

#### GET /businesses/:businessId/balance-summary

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `startDate` (string, optional) - Tanggal mulai filter (ISO 8601: YYYY-MM-DD)
- `endDate` (string, optional) - Tanggal akhir filter (ISO 8601: YYYY-MM-DD)

**Example:** `GET /businesses/1/balance-summary?startDate=2024-12-01&endDate=2024-12-31`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "business": {
      "id": 1,
      "user_id": 1,
      "business_name": "Toko Sembako Makmur",
      "category": "Retail",
      "location": "Jakarta Selatan",
      "current_balance": 5000000,
      "created_at": "2024-12-03T10:30:00Z",
      "updated_at": "2024-12-03T10:30:00Z",
      "deleted_at": null
    },
    "totalIncome": 15000000,
    "totalExpense": 10000000,
    "currentBalance": 5000000,
    "netProfit": 5000000,
    "dateRange": {
      "startDate": "2024-12-01",
      "endDate": "2024-12-31"
    }
  }
}
```

---

## Product Management

🔒 **Semua endpoint memerlukan authentication**

### 16. Create Product

Membuat produk baru untuk bisnis.

#### POST /businesses/:businessId/products

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Beras Premium 5kg",
  "current_stock": 50,
  "purchase_price": 60000,
  "selling_price": 75000
}
```

**Validation Rules:**
- `name`: Required, non-empty string
- `current_stock`: Optional, non-negative integer (default: 0)
- `purchase_price`: Optional, non-negative number
- `selling_price`: Optional, non-negative number

**Auto-calculated Fields:**
- `stock_status`: Otomatis ditentukan berdasarkan `current_stock`
  - `out`: stock = 0
  - `low`: stock < 10
  - `active`: stock >= 10

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "business_id": 1,
    "name": "Beras Premium 5kg",
    "current_stock": 50,
    "purchase_price": 60000,
    "selling_price": 75000,
    "stock_status": "active",
    "created_at": "2024-12-03T10:30:00Z",
    "updated_at": "2024-12-03T10:30:00Z",
    "deleted_at": null
  },
  "message": "Product created successfully"
}
```

---

### 17. Get All Products

Mendapatkan semua produk bisnis dengan filter dan pagination.

#### GET /businesses/:businessId/products

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `status` (string, optional) - Filter status: `active`, `low`, `out`, `inactive`
- `search` (string, optional) - Cari berdasarkan nama produk
- `limit` (integer, optional) - Jumlah hasil per halaman (default: 50, max: 100)
- `offset` (integer, optional) - Offset pagination (default: 0)

**Example:** `GET /businesses/1/products?status=low&limit=10&offset=0`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 2,
        "business_id": 1,
        "name": "Minyak Goreng 2L",
        "current_stock": 8,
        "purchase_price": 28000,
        "selling_price": 35000,
        "stock_status": "low",
        "created_at": "2024-12-03T11:00:00Z",
        "updated_at": "2024-12-03T11:00:00Z",
        "deleted_at": null
      },
      {
        "id": 5,
        "business_id": 1,
        "name": "Gula Pasir 1kg",
        "current_stock": 5,
        "purchase_price": 12000,
        "selling_price": 15000,
        "stock_status": "low",
        "created_at": "2024-12-03T09:00:00Z",
        "updated_at": "2024-12-03T15:30:00Z",
        "deleted_at": null
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### 18. Get Low Stock Products

Mendapatkan produk dengan stok rendah.

#### GET /businesses/:businessId/products/low-stock

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `threshold` (integer, optional) - Batas stok rendah (default: 10)

**Example:** `GET /businesses/1/products/low-stock?threshold=15`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "business_id": 1,
      "name": "Minyak Goreng 2L",
      "current_stock": 8,
      "purchase_price": 28000,
      "selling_price": 35000,
      "stock_status": "low",
      "created_at": "2024-12-03T11:00:00Z",
      "updated_at": "2024-12-03T11:00:00Z",
      "deleted_at": null
    }
  ]
}
```

---

### 19. Get Product by ID

Mendapatkan detail produk tertentu.

#### GET /businesses/:businessId/products/:productId

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "business_id": 1,
    "name": "Beras Premium 5kg",
    "current_stock": 50,
    "purchase_price": 60000,
    "selling_price": 75000,
    "stock_status": "active",
    "created_at": "2024-12-03T10:30:00Z",
    "updated_at": "2024-12-03T10:30:00Z",
    "deleted_at": null
  }
}
```

---

### 20. Update Product

Update informasi produk (nama, harga).

#### PUT /businesses/:businessId/products/:productId

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Beras Premium 5kg - Grade A",
  "purchase_price": 62000,
  "selling_price": 78000
}
```

**Note:** Untuk update stok, gunakan endpoint transaksi sales/purchases.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "business_id": 1,
    "name": "Beras Premium 5kg - Grade A",
    "current_stock": 50,
    "purchase_price": 62000,
    "selling_price": 78000,
    "stock_status": "active",
    "created_at": "2024-12-03T10:30:00Z",
    "updated_at": "2024-12-03T14:20:00Z",
    "deleted_at": null
  },
  "message": "Product updated successfully"
}
```

---

### 21. Delete Product

Soft delete produk.

#### DELETE /businesses/:businessId/products/:productId

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": null,
  "message": "Product deleted successfully"
}
```

---

### 22. Batch Update Stock Status

Update status stok semua produk berdasarkan jumlah stok saat ini.

#### POST /businesses/:businessId/products/update-stock-status

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "updated": 12
  },
  "message": "Stock status updated for 12 products"
}
```

---

## Transaction Management

🔒 **Semua endpoint memerlukan authentication**

### 23. Record Product Sale

Mencatat penjualan produk (otomatis update stok dan saldo).

#### POST /businesses/:businessId/transactions/sales

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "products": [
    {
      "productId": 1,
      "quantity": 5,
      "sellingPrice": 75000
    },
    {
      "productId": 2,
      "quantity": 3,
      "sellingPrice": 35000
    }
  ],
  "description": "Penjualan harian"
}
```

**Validation Rules:**
- `products`: Required, array dengan minimal 1 item
- `productId`: Required, integer
- `quantity`: Required, positive integer
- `sellingPrice`: Required, positive number
- `description`: Optional

**Automatic Operations:**
✅ Validasi stok tersedia  
✅ Buat transaction record  
✅ Kurangi stok produk  
✅ Update status stok (active/low/out)  
✅ Tambah saldo bisnis  
✅ Rollback jika ada error  

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "business_id": 1,
    "transaction_date": "2024-12-03T10:30:00Z",
    "type": "Income",
    "category": "Product Sale",
    "amount": 480000,
    "description": "Penjualan harian",
    "status": "complete",
    "TransactionDetails": [
      {
        "id": 1,
        "transaction_id": 1,
        "product_id": 1,
        "quantity": 5,
        "unit_price_at_transaction": 75000,
        "Products": {
          "id": 1,
          "name": "Beras Premium 5kg"
        }
      },
      {
        "id": 2,
        "transaction_id": 1,
        "product_id": 2,
        "quantity": 3,
        "unit_price_at_transaction": 35000,
        "Products": {
          "id": 2,
          "name": "Minyak Goreng 2L"
        }
      }
    ],
    "created_at": "2024-12-03T10:30:00Z",
    "updated_at": "2024-12-03T10:30:00Z",
    "deleted_at": null
  },
  "message": "Sale recorded successfully"
}
```

**Error Responses:**

`400 Bad Request` - Insufficient stock
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock for product Beras Premium 5kg. Available: 3, Requested: 5"
  }
}
```

`404 Not Found` - Product not found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Product with ID 999 not found"
  }
}
```

---

### 24. Record Stock Purchase

Mencatat pembelian stok (otomatis update stok dan saldo).

#### POST /businesses/:businessId/transactions/purchases

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "products": [
    {
      "productId": 1,
      "quantity": 20,
      "purchasePrice": 60000
    }
  ],
  "description": "Restock bulanan"
}
```

**Automatic Operations:**
✅ Buat transaction record  
✅ Tambah stok produk  
✅ Update status stok  
✅ Kurangi saldo bisnis  
✅ Rollback jika ada error  

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 2,
    "business_id": 1,
    "transaction_date": "2024-12-03T11:00:00Z",
    "type": "Expense",
    "category": "Stock Purchase",
    "amount": 1200000,
    "description": "Restock bulanan",
    "status": "complete",
    "TransactionDetails": [
      {
        "id": 3,
        "transaction_id": 2,
        "product_id": 1,
        "quantity": 20,
        "unit_price_at_transaction": 60000,
        "Products": {
          "id": 1,
          "name": "Beras Premium 5kg"
        }
      }
    ],
    "created_at": "2024-12-03T11:00:00Z",
    "updated_at": "2024-12-03T11:00:00Z",
    "deleted_at": null
  },
  "message": "Purchase recorded successfully"
}
```

---

### 25. Create General Transaction

Membuat transaksi umum (non-produk) seperti biaya operasional atau pendapatan lain.

#### POST /businesses/:businessId/transactions

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "type": "Expense",
  "category": "Operational",
  "amount": 500000,
  "description": "Biaya listrik bulanan",
  "status": "complete"
}
```

**Validation Rules:**
- `type`: Required, `Income` atau `Expense`
- `category`: Optional
- `amount`: Required, positive number
- `description`: Optional
- `status`: Optional, `pending`, `complete`, atau `cancel` (default: `complete`)

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 3,
    "business_id": 1,
    "transaction_date": "2024-12-03T12:00:00Z",
    "type": "Expense",
    "category": "Operational",
    "amount": 500000,
    "description": "Biaya listrik bulanan",
    "status": "complete",
    "created_at": "2024-12-03T12:00:00Z",
    "updated_at": "2024-12-03T12:00:00Z",
    "deleted_at": null
  },
  "message": "Transaction created successfully"
}
```

---

### 26. Get All Transactions

Mendapatkan semua transaksi dengan filter.

#### GET /businesses/:businessId/transactions

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `type` (string, optional) - Filter tipe: `Income` atau `Expense`
- `category` (string, optional) - Filter kategori
- `status` (string, optional) - Filter status: `pending`, `complete`, `cancel`
- `startDate` (string, optional) - Filter tanggal mulai (ISO 8601)
- `endDate` (string, optional) - Filter tanggal akhir (ISO 8601)
- `limit` (integer, optional) - Jumlah hasil (default: 50)
- `offset` (integer, optional) - Offset pagination (default: 0)

**Example:** `GET /businesses/1/transactions?type=Income&startDate=2024-12-01&limit=10`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "business_id": 1,
        "transaction_date": "2024-12-03T10:30:00Z",
        "type": "Income",
        "category": "Product Sale",
        "amount": 480000,
        "description": "Penjualan harian",
        "status": "complete",
        "created_at": "2024-12-03T10:30:00Z",
        "updated_at": "2024-12-03T10:30:00Z",
        "deleted_at": null
      }
    ],
    "pagination": {
      "total": 128,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### 27. Get Transaction by ID

Mendapatkan detail transaksi dengan product details.

#### GET /businesses/:businessId/transactions/:transactionId

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "business_id": 1,
    "transaction_date": "2024-12-03T10:30:00Z",
    "type": "Income",
    "category": "Product Sale",
    "amount": 480000,
    "description": "Penjualan harian",
    "status": "complete",
    "TransactionDetails": [
      {
        "id": 1,
        "transaction_id": 1,
        "product_id": 1,
        "quantity": 5,
        "unit_price_at_transaction": 75000,
        "Products": {
          "id": 1,
          "name": "Beras Premium 5kg"
        }
      }
    ],
    "created_at": "2024-12-03T10:30:00Z",
    "updated_at": "2024-12-03T10:30:00Z",
    "deleted_at": null
  }
}
```

---

### 28. Update Transaction

Update deskripsi atau status transaksi (hanya untuk transaksi non-produk).

#### PUT /businesses/:businessId/transactions/:transactionId

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "description": "Biaya listrik dan air bulanan",
  "status": "complete"
}
```

**Note:** Tidak bisa mengubah amount atau type. Untuk transaksi produk, tidak bisa diubah.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 3,
    "business_id": 1,
    "transaction_date": "2024-12-03T12:00:00Z",
    "type": "Expense",
    "category": "Operational",
    "amount": 500000,
    "description": "Biaya listrik dan air bulanan",
    "status": "complete",
    "created_at": "2024-12-03T12:00:00Z",
    "updated_at": "2024-12-03T14:20:00Z",
    "deleted_at": null
  },
  "message": "Transaction updated successfully"
}
```

---

### 29. Cancel Transaction

Membatalkan transaksi (set status = cancel).

#### PUT /businesses/:businessId/transactions/:transactionId/cancel

**Headers:**
```
Authorization: Bearer {token}
```

**Note:** Membatalkan transaksi tidak otomatis reverse stok atau saldo.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 3,
    "business_id": 1,
    "transaction_date": "2024-12-03T12:00:00Z",
    "type": "Expense",
    "category": "Operational",
    "amount": 500000,
    "description": "Biaya listrik bulanan",
    "status": "cancel",
    "created_at": "2024-12-03T12:00:00Z",
    "updated_at": "2024-12-03T14:30:00Z",
    "deleted_at": null
  },
  "message": "Transaction cancelled successfully"
}
```

---

### 30. Delete Transaction

Soft delete transaksi.

#### DELETE /businesses/:businessId/transactions/:transactionId

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": null,
  "message": "Transaction deleted successfully"
}
```

---

### 31. Get Transaction Totals

Mendapatkan total income dan expense.

#### GET /businesses/:businessId/transactions/totals

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `startDate` (string, optional) - Filter tanggal mulai
- `endDate` (string, optional) - Filter tanggal akhir

**Example:** `GET /businesses/1/transactions/totals?startDate=2024-12-01&endDate=2024-12-31`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "income": 15000000,
    "expense": 10000000,
    "net": 5000000,
    "dateRange": {
      "startDate": "2024-12-01",
      "endDate": "2024-12-31"
    }
  }
}
```

---

## AI Chat

🔒 **Semua endpoint memerlukan authentication**

### 32. Send Chat Message

Mengirim pesan ke AI assistant dan mendapat respons. Mendukung sistem multi-chat dimana user dapat memiliki beberapa sesi percakapan.

#### POST /chat/message

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "message": "Bagaimana cara meningkatkan penjualan bisnis saya?",
  "chatId": 1
}
```

**Request Parameters:**
- `message` (string, required) - Pesan yang akan dikirim ke AI
- `chatId` (integer, optional) - ID chat untuk melanjutkan percakapan. Jika kosong/null, akan membuat chat baru

**Logika:**
- **Jika `chatId` kosong/null:** Service akan membuat chat baru dan menambahkan **konteks bisnis lengkap** (informasi bisnis, produk, transaksi) ke prompt pesan pertama. Ini memberikan AI pemahaman komprehensif tentang kondisi bisnis user.
- **Jika `chatId` terisi:** Melanjutkan percakapan pada chat yang sudah ada dengan riwayat pesan sebelumnya. AI akan mempertahankan konteks percakapan.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "chat": {
      "id": 1,
      "user_id": 1,
      "created_at": "2024-12-03T10:30:00Z",
      "updated_at": "2024-12-03T10:30:00Z",
      "deleted_at": null
    },
    "userMessage": {
      "id": 1,
      "chat_id": 1,
      "sender": "User",
      "content": "Bagaimana cara meningkatkan penjualan bisnis saya?",
      "created_at": "2024-12-03T10:30:00Z",
      "deleted_at": null
    },
    "botResponse": {
      "id": 2,
      "chat_id": 1,
      "sender": "Bot",
      "content": "Saya dapat membantu Anda menganalisis data penjualan. Beberapa strategi yang bisa diterapkan:\n1. Analisis produk terlaris\n2. Promosi untuk produk dengan stok berlebih\n3. Tingkatkan marketing untuk produk margin tinggi\n\nPeriode mana yang ingin Anda tinjau?",
      "created_at": "2024-12-03T10:30:01Z",
      "deleted_at": null
    }
  }
}
```

**Error Responses:**

`400 Bad Request` - Empty message
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Message is required"
  }
}
```

---

### 33. Get Chat History

Mendapatkan riwayat percakapan dengan AI.

#### GET /chat/history

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (integer, optional) - Jumlah pesan (default: 50, max: 100)

**Example:** `GET /chat/history?limit=20`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "chat": {
      "id": 1,
      "user_id": 1,
      "created_at": "2024-12-03T10:30:00Z",
      "updated_at": "2024-12-03T10:30:00Z",
      "deleted_at": null
    },
    "messages": [
      {
        "id": 1,
        "chat_id": 1,
        "sender": "User",
        "content": "Bagaimana cara meningkatkan penjualan?",
        "created_at": "2024-12-03T10:30:00Z",
        "deleted_at": null
      },
      {
        "id": 2,
        "chat_id": 1,
        "sender": "Bot",
        "content": "Saya dapat membantu Anda menganalisis...",
        "created_at": "2024-12-03T10:30:01Z",
        "deleted_at": null
      }
    ]
  }
}
```

---

### 34. Clear Chat History

Menghapus pesan dan record chat **terbaru/aktif** (soft delete) milik user.

#### DELETE /chat/history

**Headers:**
```
Authorization: Bearer {token}
```

**Logika:**
Endpoint ini akan mencari chat terbaru user (`findLatestChat`) dan menghapusnya beserta semua pesan di dalamnya. Jika user tidak memiliki chat aktif, akan mengembalikan pesan bahwa tidak ada chat history yang perlu dihapus.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": null,
  "message": "Chat history cleared successfully"
}
```

**Response (Jika tidak ada chat):** `200 OK`
```json
{
  "success": true,
  "data": null,
  "message": "No active chat history to clear"
}
```

---

### 35. Clear Specific Chat History

Menghapus pesan dan record chat spesifik (soft delete) berdasarkan ID chat.

#### DELETE /chat/:chatId

**Headers:**
```
Authorization: Bearer {token}
```

**URL Parameters:**
- `chatId` (integer) - ID chat yang ingin dihapus

**Example:** `DELETE /chat/1`

**Validasi:**
- Memverifikasi bahwa chat dengan ID tersebut ada
- Memverifikasi bahwa chat milik user yang sedang login
- Soft delete semua messages dalam chat
- Soft delete chat record

**Response:** `200 OK`
```json
{
  "success": true,
  "data": null,
  "message": "Chat 1 history cleared successfully"
}
```

**Error Responses:**

`400 Bad Request` - Invalid chat ID format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid chat ID format"
  }
}
```

`404 Not Found` - Chat not found atau user tidak memiliki akses
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Chat not found or access denied"
  }
}
```

---

## Known Limitations & Future Endpoints

### User Profile Picture Management

**Status:** ✅ Implemented (December 5, 2024)  
**Description:** API untuk upload dan manage avatar/profile picture user menggunakan Supabase Storage terintegrasi dengan endpoint **PUT /users/me**.

**Storage Configuration:**
- **Bucket:** `user-image` (Public bucket)
- **Bucket URL:** `https://supabase.com/dashboard/project/puxrvmtzptuukbisgbnn/storage/files/buckets/user-image`
- **Default Image:** `https://puxrvmtzptuukbisgbnn.supabase.co/storage/v1/object/public/user-image/user.png`
- **Database Field:** `Users.image` (text, nullable, default: default image URL)

**Endpoint:** `PUT /users/me` (dengan field `avatar` opsional)

**Cara Penggunaan:**
Lihat dokumentasi lengkap di [Endpoint 6: Update User Profile](#6-update-user-profile)

**Implementation Details:**
- Upload file via multipart/form-data dengan field name `avatar`
- File validation: jpg, jpeg, png, max 2MB
- Upload ke Supabase Storage bucket `user-image`
- Filename format: `user_{userId}_{timestamp}.{ext}`
- Update `Users.image` field di database dengan public URL
- Hapus file lama dari storage jika ada (kecuali default image)
- Automatic rollback jika terjadi error

---

## Testing Guide

### Using cURL

```bash
# 1. Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","full_name":"Test User"}'

# 2. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Save the token from response

# 3. Get user profile
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 4. Create business
curl -X POST http://localhost:3000/api/v1/businesses \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"business_name":"Test Store","category":"Retail","current_balance":5000000}'

# 5. Create product
curl -X POST http://localhost:3000/api/v1/businesses/1/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"name":"Product A","current_stock":100,"purchase_price":10000,"selling_price":15000}'

# 6. Record sale
curl -X POST http://localhost:3000/api/v1/businesses/1/transactions/sales \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"products":[{"productId":1,"quantity":5,"sellingPrice":15000}],"description":"Daily sales"}'
```

### Using Postman

1. Import collection dari dokumentasi ini
2. Set environment variable `baseUrl` = `http://localhost:3000/api/v1`
3. Set environment variable `token` setelah login
4. Gunakan `{{baseUrl}}` dan `{{token}}` dalam request

---

## Rate Limiting

Untuk mencegah abuse, API memiliki rate limiting:

- **Standard endpoints:** 100 requests/menit
- **AI Chat endpoints:** 20 requests/menit

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1701600000
```

---

## Support

Untuk pertanyaan atau issue, hubungi tim development NusaBiz.

---

**Last Updated:** December 5, 2024  
**API Version:** 1.0.0
