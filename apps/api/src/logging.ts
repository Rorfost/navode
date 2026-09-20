export interface ApiLogger {
  request(event: {
    durationMs: number;
    method: string;
    path: string;
    requestId: string;
    status: number;
  }): void;
  error(event: {
    code: string;
    method: string;
    path: string;
    requestId: string;
    status: number;
  }): void;
  rateLimit?(event: {
    method: string;
    path: string;
    requestId: string;
    retryAfterSeconds: number;
  }): void;
}

export const consoleLogger: ApiLogger = {
  request(event) {
    console.log(JSON.stringify({ event: 'api.request', ...event }));
  },
  error(event) {
    console.error(JSON.stringify({ event: 'api.error', ...event }));
  },
  rateLimit(event) {
    console.warn(JSON.stringify({ event: 'api.rate_limit', ...event }));
  },
};
