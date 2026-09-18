import { describe, expect, it } from 'vitest';
import app from '../src/index';

describe('Navode API', () => {
  it('returns health metadata', async () => {
    const response = await app.request('/health');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok', service: 'navode-api' });
  });
});
