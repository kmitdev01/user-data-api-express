import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/MetricsService';

export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Patch res.end or use res.on('finish') to capture the final status and duration
  res.on('finish', () => {
    const duration = Date.now() - start;
    metricsService.recordRequest(res.statusCode, duration);
  });

  next();
};
