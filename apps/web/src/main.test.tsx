import { describe, expect, it } from 'vitest';
import { findCommand, type Command } from '@navode/core';

describe('web command setup', () => {
  it('keeps the Google shortcut available', () => {
    const commands: Command[] = [{ id: 'google', label: 'google', kind: 'search', template: '', aliases: ['g'] }];
    expect(findCommand(commands, 'g accessibility')?.id).toBe('google');
  });
});
