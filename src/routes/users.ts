import { Router, Request, Response } from 'express';
import { mockUsers } from '../mockData';
import { LruCache } from '../cache/LruCache';
import { User } from '../types/user';
import { rateLimiter } from '../middleware/rateLimit';
import { dbQueue } from '../services/DatabaseQueue';

export const userRoutes = Router();

// Cache Setup: Capacity 100, TTL 60 seconds
const userCache = new LruCache<User>(100, 60);

// Request Coalescing Map
const pendingRequests = new Map<string, Promise<User | undefined>>();

// Apply rate limiter specifically to routes if needed, or globally in server.ts
// Here we apply it to all user routes as per requirements implied
userRoutes.use(rateLimiter);

// Response Time Tracking (Simple in-memory)
let totalResponseTimeMs = 0;
let totalRequests = 0;

// 1. Static/Specific Routes FIRST
// Cache Management Endpoints
userRoutes.get('/cache-status', (req: Request, res: Response) => {
  const stats = userCache.getStats();
  const avgResponseTime = totalRequests > 0 ? totalResponseTimeMs / totalRequests : 0;

  res.json({
    ...stats,
    averageResponseTime: avgResponseTime.toFixed(2) + 'ms',
  });
});

userRoutes.delete('/cache', (req: Request, res: Response) => {
  userCache.clear();
  // Reset stats too
  totalResponseTimeMs = 0;
  totalRequests = 0;
  res.status(204).send();
});

// List All Users
userRoutes.get('/', (req: Request, res: Response) => {
  // Return all mock users
  res.json(mockUsers);
});

// 2. Dynamic/Wildcard Routes LAST
userRoutes.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const userId = req.params.id;

  // Helper to send response and track time
  const sendResponse = (data: unknown, status: number = 200) => {
    const duration = Date.now() - start;
    totalResponseTimeMs += duration;
    totalRequests++;
    res.status(status).json(data);
  };

  // 1. Check Cache
  const cachedUser = userCache.get(userId);
  if (cachedUser) {
    sendResponse(cachedUser);
    return;
  }

  // 2. Check Pending Requests (Coalescing)
  if (pendingRequests.has(userId)) {
    try {
      const user = await pendingRequests.get(userId);
      if (user) {
        sendResponse(user);
      } else {
        sendResponse({ error: 'User not found' }, 404);
      }
    } catch (_error) {
      sendResponse({ error: 'Internal error' }, 500);
    }
    return;
  }

  // 3. Queue Request logic
  const fetchPromise = dbQueue.enqueue(userId);

  // store promise
  pendingRequests.set(userId, fetchPromise);

  try {
    const user = await fetchPromise;

    // clean up pending
    pendingRequests.delete(userId);

    if (user) {
      userCache.set(userId, user);
      sendResponse(user);
    } else {
      sendResponse({ error: 'User not found' }, 404);
    }
  } catch (_err) {
    pendingRequests.delete(userId);
    sendResponse({ error: 'Database error' }, 500);
  }
});

userRoutes.post('/', (req: Request, res: Response) => {
  const { name, email, plan } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: 'Name and email required' });
    return;
  }
  const newUser: User = {
    id: (mockUsers.length + 1).toString(),
    name,
    email,
    plan: plan || 'free',
    isActive: true,
  };
  mockUsers.push(newUser);
  userCache.set(newUser.id, newUser);
  res.status(201).json(newUser);
});
