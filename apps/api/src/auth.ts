import { ApiError } from './errors';

export type AuthenticatedActor = {
  userId: string;
  sessionId: string;
  deviceId?: string;
};

export interface Authenticator {
  authenticate(request: Request): Promise<AuthenticatedActor>;
}

export class RejectingAuthenticator implements Authenticator {
  async authenticate(): Promise<AuthenticatedActor> {
    throw new ApiError('authentication_required', 'Authentication is required.', 401);
  }
}
