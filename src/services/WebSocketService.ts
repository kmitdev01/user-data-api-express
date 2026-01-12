import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

export interface SeatUpdate {
  type: 'SEAT_UPDATE';
  seatId: string;
  newStatus: 'available' | 'reserved' | 'sold' | 'held';
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  public initialize(server: Server): void {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('WebSocket client connected');
      this.clients.add(ws);

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to seat updates' }));
    });

    console.log('WebSocket server initialized');
  }

  public broadcastSeatUpdate(seatId: string, newStatus: SeatUpdate['newStatus']): void {
    const message: SeatUpdate = {
      type: 'SEAT_UPDATE',
      seatId,
      newStatus,
    };

    const payload = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    console.log(`Broadcasted seat update: ${seatId} -> ${newStatus}`);
  }

  public getClientCount(): number {
    return this.clients.size;
  }
}

export const wsService = new WebSocketService();
