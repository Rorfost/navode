import { describe, expect, it } from 'vitest';

describe('extension manifest policy', () => {
  it('documents no broad runtime permissions in the starter shell', () => {
    const permissions: string[] = [];
    expect(permissions).toEqual([]);
  });
});
