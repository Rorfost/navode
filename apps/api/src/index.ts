import { Hono } from 'hono';
import { NAVODE_VERSION } from '@navode/config';

type Bindings = { APP_ENV?: string; APP_VERSION?: string };

const app = new Hono<{ Bindings: Bindings }>();

app.get('/health', (context) =>
  context.json({
    status: 'ok',
    service: 'navode-api',
    environment: context.env.APP_ENV ?? 'development',
  }),
);

app.get('/version', (context) =>
  context.json({ service: 'navode-api', version: context.env.APP_VERSION ?? NAVODE_VERSION }),
);

export default app;
