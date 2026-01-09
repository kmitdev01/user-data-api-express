export interface RequestMetrics {
  totalRequests: number;
  totalResponseTimeMs: number;
  statusCodes: {
    [key: string]: number;
  };
}

export class MetricsService {
  private static instance: MetricsService;
  
  private totalRequests = 0;
  private totalResponseTimeMs = 0;
  private statusCodes: Record<string, number> = {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
  };

  private constructor() {}

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  public recordRequest(status: number, durationMs: number): void {
    this.totalRequests++;
    this.totalResponseTimeMs += durationMs;

    const range = Math.floor(status / 100);
    const rangeKey = `${range}xx`;
    
    if (this.statusCodes[rangeKey] !== undefined) {
      this.statusCodes[rangeKey]++;
    } else {
      this.statusCodes['other'] = (this.statusCodes['other'] || 0) + 1;
    }
  }

  public getStats() {
    const avgResponseTime = this.totalRequests > 0 
      ? (this.totalResponseTimeMs / this.totalRequests).toFixed(2) 
      : '0.00';

    return {
      totalRequests: this.totalRequests,
      statusDistribution: this.statusCodes,
      averageResponseTime: `${avgResponseTime}ms`,
      uptime: process.uptime().toFixed(0) + 's',
    };
  }

  public reset(): void {
    this.totalRequests = 0;
    this.totalResponseTimeMs = 0;
    Object.keys(this.statusCodes).forEach(key => this.statusCodes[key] = 0);
  }
}

export const metricsService = MetricsService.getInstance();
