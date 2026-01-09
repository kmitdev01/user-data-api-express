import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { userRoutes } from './routes/users';
import { monitoringMiddleware } from './middleware/monitoring';
import { metricsService } from './services/MetricsService';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(monitoringMiddleware);

// Routes
app.use('/users', userRoutes);

// Root Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'User Data API is running' });
});

app.get('/metrics', (req: Request, res: Response) => {
  res.json(metricsService.getStats());
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
