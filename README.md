# User Data Backend Service

A high-performance Node.js/Express service for managing user data with advanced caching and concurrency features.

## 🚀 Features

### 1. Caching Strategy (LRU)
- **Implementation**: Custom In-Memory LRU (Least Recently Used) Cache.
- **TTL (Time-To-Live)**: 60 seconds.
- **Capacity**: 100 items.
- **Behavior**:
  - Automatically evicts the least recently accessed item when full.
  - Background cleanup task runs every 5 seconds to remove expired items.
  - Endpoints: `GET /users/cache-status`, `DELETE /users/cache`.

### 2. Rate Limiting
- **Burst Support**: Allows short bursts of traffic while protecting against sustained abuse.
- **Limits**:
  - **Minute Limit**: 10 requests per minute.
  - **Burst Limit**: 5 requests per 10 seconds.
- **Response**: Returns `429 Too Many Requests` with a descriptive error details.

### 3. Asynchronous Request Handling
- **Request Coalescing**:
  - Prevents "Thundering Herd" problems.
  - If multiple requests for the same User ID arrive simultaneously while a DB fetch is in progress, they all await the **same** promise.
  - Result: Only **one** DB query is executed for N concurrent requests.
- **Non-Blocking**:
  - Validated to handle lightweight requests (e.g., cached hits or home route) instantaneously even while processing simulated slow DB operations.

## 🛠️ Setup & Running

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation
```bash
pnpm install
```

### Running Development Server
```bash
pnpm dev
# Server starts at http://localhost:3001
```

### Testing & Validation
A custom validation script is included to verify performance metrics.

```bash
# Verify Caching, Latency, and Rate Limits
bash validate-backend.sh
```

## 📚 API Endpoints

- `GET /users`: List all users.
- `GET /users/:id`: Get user by ID (Cached).
- `POST /users`: Create a new user.
- `GET /users/cache-status`: View cache hits, misses, size, and avg response time.
- `DELETE /users/cache`: Clear the cache.
