import { Router, Request, Response } from 'express';
import { mockUsers } from '../mockData';
import { LruCache } from '../cache/LruCache';
import { User } from '../types/user';
import { rateLimiter } from '../middleware/rateLimit';
import { dbQueue } from '../services/DatabaseQueue';

import { metricsService } from '../services/MetricsService';

export const userRoutes = Router();

// Cache Setup: Capacity 100, TTL 60 seconds
const userCache = new LruCache<User>(100, 60);

// Request Coalescing Map
const pendingRequests = new Map<string, Promise<User | undefined>>();

// Apply rate limiter specifically to routes if needed, or globally in server.ts
userRoutes.use(rateLimiter);

// 1. Static/Specific Routes FIRST
// Cache Management Endpoints
userRoutes.get('/cache-status', (req: Request, res: Response) => {
  const stats = userCache.getStats();
  const globalStats = metricsService.getStats();

  res.json({
    ...stats,
    averageResponseTime: globalStats.averageResponseTime,
    uptime: globalStats.uptime
  });
});

userRoutes.delete('/cache', (req: Request, res: Response) => {
  userCache.clear();
  metricsService.reset();
  res.status(204).send();
});

// List All Users
userRoutes.get('/', (req: Request, res: Response) => {
  // Return all mock users
  res.json(mockUsers);
});

// 2. Dynamic/Wildcard Routes LAST
userRoutes.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id;

  // Helper to send response
  const sendResponse = (data: unknown, status: number = 200) => {
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
