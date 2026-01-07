import { User } from '../types/user';
import { mockUsers } from '../mockData';

type QueueItem = {
  userId: string;
  resolve: (user: User | undefined) => void;
  reject: (error: Error) => void;
};

export class DatabaseQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private batchSize = 3; // Process 3 items at a time
  private processIntervalMs = 200; // Simulate DB latency

  constructor() {}

  /**
   * Enqueue a request for a user
   */
  public enqueue(userId: string): Promise<User | undefined> {
    return new Promise((resolve, reject) => {
      this.queue.push({ userId, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the queue asynchronously
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Simulate async processing delay
    setTimeout(() => {
        this.processBatch();
    }, this.processIntervalMs);
  }

  private processBatch() {
      // Take a batch of requests
      const batch = this.queue.splice(0, this.batchSize);

      batch.forEach(item => {
          const user = mockUsers.find(u => u.id === item.userId);
          // Resolve immediately after the simulated delay
          item.resolve(user);
      });

      this.isProcessing = false;
      
      // If items remain, trigger next processing cycle
      if (this.queue.length > 0) {
          this.processQueue();
      }
  }
}

export const dbQueue = new DatabaseQueue();
