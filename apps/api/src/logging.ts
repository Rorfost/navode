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
}

export const consoleLogger: ApiLogger = {
  request(event) {
    console.log(JSON.stringify({ event: 'api.request', ...event }));
  },
  error(event) {
    console.error(JSON.stringify({ event: 'api.error', ...event }));
  },
};
