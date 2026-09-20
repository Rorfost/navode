export type ApiErrorCode =
  | 'authentication_required'
  | 'configuration_error'
  | 'database_unavailable'
  | 'forbidden'
  | 'invalid_request'
  | 'not_found'
  | 'rate_limited';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    readonly details?: Record<string, string>,
  ) {
    super(message);
  }
}
