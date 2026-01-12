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

### 4. Monitoring & Telemetry
- **Centralized Metrics**: Real-time tracking of request counts, response durations, and status code distributions.
- **Middleware Integration**: Automatically captures performance data for every incoming request.
- **Endpoint Expiry**: Standards-based visibility into system health and cache effectiveness.

### 5. Real-Time Seat Updates (WebSockets)
- **Live Broadcasting**: Seat status changes are pushed to all connected clients instantly.
- **Auto-Reconnect**: Frontend hook automatically reconnects on disconnect.
- **Conflict Prevention**: Prevents double-booking by notifying users when seats become unavailable.

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

### User Management
- `GET /users`: List all users.
- `GET /users/:id`: Get user by ID (Cached).
- `POST /users`: Create a new user.
- `GET /users/cache-status`: View detailed cache effectiveness combined with performance metrics.
- `DELETE /users/cache`: Clear the cache and reset telemetry.

### Seat Management
- `GET /seats`: Get all seat statuses (for initial frontend sync).
- `PATCH /seats/:id`: Update a seat's status (triggers WebSocket broadcast).
  - **Body**: `{ "status": "available" | "reserved" | "sold" | "held" }`
  - **Response**: `{ "message": "Seat updated", "seat": { "id": "...", "status": "..." } }`
- `GET /seats/ws-status`: Check WebSocket connection count.

### Telemetry
- `GET /metrics`: View global API telemetry (Total requests, Status distribution, Avg response time, Uptime).

## 🔌 WebSocket API

The server upgrades HTTP connections to WebSocket on port **3001**.

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3001');
```

### Message Format (Server → Client)
```json
{
  "type": "SEAT_UPDATE",
  "seatId": "sec-A-row-B-seat-5",
  "newStatus": "sold"
}
```

### Testing WebSocket

Use `wscat` or a browser to test:

```bash
# Install wscat if needed
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3001

# In another terminal, trigger a seat update
curl -X PATCH http://localhost:3001/seats/sec-1-row-A-seat-1 \
  -H "Content-Type: application/json" \
  -d '{"status": "sold"}'

# The wscat terminal will receive:
# {"type":"SEAT_UPDATE","seatId":"sec-1-row-A-seat-1","newStatus":"sold"}
```

