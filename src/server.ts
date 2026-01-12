import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import bodyParser from 'body-parser';
import cors from 'cors';
import { userRoutes } from './routes/users';
import { seatRoutes } from './routes/seats';
import { monitoringMiddleware } from './middleware/monitoring';
import { metricsService } from './services/MetricsService';
import { wsService } from './services/WebSocketService';

const app = express();
const PORT = 3001;

// Create HTTP server (needed for WebSocket)
const server = createServer(app);

// Initialize WebSocket server
wsService.initialize(server);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(monitoringMiddleware);

// Routes
app.use('/users', userRoutes);
app.use('/seats', seatRoutes);

// Root Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'User Data API is running', websocket: 'ws://localhost:3001' });
});

app.get('/metrics', (req: Request, res: Response) => {
  res.json(metricsService.getStats());
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}`);
});
