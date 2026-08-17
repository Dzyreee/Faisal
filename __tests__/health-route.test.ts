/**
 * @jest-environment node
 */
import { GET } from '../app/api/health+api';

describe('GET /api/health', () => {
  it('reports the server-side key as loaded', async () => {
    process.env.FAKE_KEY = 'hunter2';

    const response = GET();
    const body = await response.json();

    expect(body).toEqual({ ok: true, keyLoaded: true });
  });

  it('never echoes the secret value', async () => {
    process.env.FAKE_KEY = 'hunter2';

    const response = GET();
    const raw = await response.text();

    expect(raw).not.toContain('hunter2');
  });
});
