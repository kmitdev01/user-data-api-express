import { Router, Request, Response } from 'express';
import { wsService } from '../services/WebSocketService';
import * as fs from 'fs';
import * as path from 'path';

export const seatRoutes = Router();

type SeatStatus = 'available' | 'reserved' | 'sold' | 'held';

// In-memory seat store (would be database in production)
const seats: Map<string, { id: string; status: SeatStatus }> = new Map();

// Load seats from venue.json to get initial statuses
const initializeSeats = () => {
  try {
    const venueJsonPath = path.join(__dirname, '../../../frontend/public/venue.json');
    const venueData = JSON.parse(fs.readFileSync(venueJsonPath, 'utf-8'));
    
    venueData.venue.layout.sections.forEach((section: { rows: { seats: { id: string; status: SeatStatus }[] }[] }) => {
      section.rows.forEach((row) => {
        row.seats.forEach((seat) => {
          seats.set(seat.id, { id: seat.id, status: seat.status });
        });
      });
    });
    
    console.log(`Loaded ${seats.size} seats from venue.json`);
  } catch (error) {
    console.error('Failed to load venue.json, initializing empty seats:', error);
  }
};

initializeSeats();

// GET /seats - List all seats
seatRoutes.get('/', (req: Request, res: Response) => {
  res.json(Array.from(seats.values()));
});

// PATCH /seats/:id - Update seat status
seatRoutes.patch('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['available', 'reserved', 'sold', 'held'].includes(status)) {
    res.status(400).json({ error: 'Invalid status. Must be: available, reserved, sold, or held' });
    return;
  }

  const seat = seats.get(id);
  if (!seat) {
    res.status(404).json({ error: 'Seat not found' });
    return;
  }

  seat.status = status;
  seats.set(id, seat);

  // Broadcast to all connected clients
  wsService.broadcastSeatUpdate(id, status);

  res.json({ message: 'Seat updated', seat });
});

// GET /seats/ws-status - Check WebSocket connections
seatRoutes.get('/ws-status', (req: Request, res: Response) => {
  res.json({ connectedClients: wsService.getClientCount() });
});
