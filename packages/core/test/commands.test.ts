import { describe, expect, it } from 'vitest';
import { findCommand, parseCommand, type Command } from '../src/index';

describe('parseCommand', () => {
  it('normalizes a command and keeps its argument', () => {
    expect(parseCommand('  YT segment tree  ')).toEqual({ name: 'yt', argument: 'segment tree' });
  });
});

describe('findCommand', () => {
  it('matches a command alias case-insensitively', () => {
    const commands: Command[] = [
      {
        id: 'youtube',
        label: 'youtube',
        kind: 'search',
        template: 'https://youtube.com',
        aliases: ['yt'],
      },
    ];
    expect(findCommand(commands, 'YT graph theory')?.id).toBe('youtube');
  });
});
