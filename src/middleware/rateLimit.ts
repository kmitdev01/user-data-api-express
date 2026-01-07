import { Request, Response, NextFunction } from 'express';

interface RequestLog {
  timestamp: number;
}

const requestLogs = new Map<string, RequestLog[]>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  if (!requestLogs.has(ip)) {
    requestLogs.set(ip, []);
  }

  const logs = requestLogs.get(ip)!;

  // Cleanup old logs (> 60 seconds)
  const windowStart = now - 60000;
  const burstStart = now - 10000;

  // Filter valid logs for the 1-minute window
  const validLogs = logs.filter((log) => log.timestamp > windowStart);
  requestLogs.set(ip, validLogs);

  // Check 1-minute limit (10 reqs)
  if (validLogs.length >= 10) {
    res.status(429).json({ error: 'Too Many Requests: Limit is 10 requests per minute.' });
    return;
  }

  // Check 10-second burst limit (5 reqs)
  const burstLogs = validLogs.filter((log) => log.timestamp > burstStart);
  if (burstLogs.length >= 5) {
    res.status(429).json({ error: 'Too Many Requests: Burst limit is 5 requests per 10 seconds.' });
    return;
  }

  // Log current request
  validLogs.push({ timestamp: now });
  requestLogs.set(ip, validLogs);

  next();
};
