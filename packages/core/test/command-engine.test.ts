import {
  MAX_RECENT_EXECUTIONS,
  clearRecentExecutions,
  createCommandAlias,
  getCommandResults,
  parseCommandInput,
  recordRecentExecution,
  removeCommandAlias,
  resolveCommand,
  type RecentExecution,
} from '../src/index';

describe('command engine parsing and search aliases', () => {
  it('parses predictable command name and argument boundaries', () => {
    expect(parseCommandInput('  GH navode command center  ')).toEqual({
      name: 'gh',
      argument: 'navode command center',
    });
    expect(parseCommandInput('   ')).toBeNull();
  });

  it.each([
    ['g graph theory', 'https://www.google.com/search?q=graph%20theory'],
    ['yt segment tree', 'https://www.youtube.com/results?search_query=segment%20tree'],
    ['gh navode', 'https://github.com/search?q=navode'],
    ['cf 1700', 'https://codeforces.com/problemset?search=1700'],
    ['lc two sum', 'https://leetcode.com/problemset/?search=two%20sum'],
  ])('resolves %s to its public search URL', (input, url) => {
    const result = resolveCommand(input);

    expect(result.action).toEqual({ type: 'open-url', url });
    expect(result.source).toBe('alias');
  });

  it('uses the configured provider as a fallback for ordinary text', () => {
    const result = resolveCommand('deterministic algorithms', { defaultSearchProvider: 'youtube' });

    expect(result.source).toBe('fallback-search');
    expect(result.action).toEqual({
      type: 'open-url',
      url: 'https://www.youtube.com/results?search_query=deterministic%20algorithms',
    });
  });

  it('starts a requested focus duration and opens local utility views', () => {
    expect(resolveCommand('focus 60').action).toEqual({ type: 'start-focus', durationMinutes: 60 });
    expect(resolveCommand('note').action).toEqual({ type: 'open-view', view: 'note' });
    expect(resolveCommand('today').action).toEqual({ type: 'open-view', view: 'today' });
  });
});

describe('command engine safety and matching', () => {
  it('opens direct http URLs and rejects unsafe schemes', () => {
    expect(resolveCommand('navode.dev/path').action).toEqual({ type: 'open-url', url: 'https://navode.dev/path' });
    expect(resolveCommand('https://example.com/work').action).toEqual({ type: 'open-url', url: 'https://example.com/work' });
    expect(resolveCommand('javascript:alert(1)').action).toMatchObject({ type: 'error' });
    expect(resolveCommand('data:text/html,unsafe').action).toMatchObject({ type: 'error' });
  });

  it('ranks exact and prefix local matches above search fallback', () => {
    const results = getCommandResults('proj', {
      projects: [{ id: 'navode', label: 'Navode V1', aliases: ['proj'] }],
      quickLinks: [{ id: 'docs', label: 'Project docs', url: 'https://example.com/docs' }],
    });

    expect(results[0]).toMatchObject({ id: 'project:navode', source: 'project' });
    expect(results.map((result) => result.id)).toContain('quick-link:docs');
  });

  it('resolves quick links, workspaces, and snippets without guessing', () => {
    expect(resolveCommand('docs', { quickLinks: [{ id: 'docs', label: 'Docs', url: 'https://example.com/docs' }] }).source).toBe('quick-link');
    expect(resolveCommand('writing', { workspaces: [{ id: 'write', label: 'Writing' }] }).action).toEqual({
      type: 'launch-workspace',
      workspaceId: 'write',
    });
    expect(resolveCommand('signature', { snippets: [{ id: 'sign', label: 'Signature' }] }).action).toEqual({
      type: 'run-snippet',
      snippetId: 'sign',
    });
  });
});

describe('custom aliases and recent execution history', () => {
  it('creates, resolves, edits through replacement, and removes safe custom aliases', () => {
    const alias = createCommandAlias(
      { alias: 'docs', label: 'Search docs', urlTemplate: 'https://docs.example.com/?q={query}' },
      'docs-1',
    );
    expect(alias).toEqual({
      id: 'docs-1',
      alias: 'docs',
      label: 'Search docs',
      urlTemplate: 'https://docs.example.com/?q={query}',
    });
    expect(createCommandAlias({ alias: 'g', label: 'Override', urlTemplate: 'https://example.com' }, 'bad')).toBeNull();
    expect(createCommandAlias({ alias: 'bad', label: 'Unsafe', urlTemplate: 'javascript:alert(1)' }, 'bad')).toBeNull();

    const result = resolveCommand('docs browser storage', { customAliases: [alias!] });
    expect(result.action).toEqual({ type: 'open-url', url: 'https://docs.example.com/?q=browser%20storage' });
    expect(removeCommandAlias([alias!], alias!.id)).toEqual([]);
  });

  it('bounds non-sensitive history and can clear it', () => {
    const result = resolveCommand('g private search text');
    let history: RecentExecution[] = [];
    for (let index = 0; index < MAX_RECENT_EXECUTIONS + 2; index += 1) {
      history = recordRecentExecution(history, result, `2026-01-01T00:00:${String(index).padStart(2, '0')}.000Z`);
    }

    expect(history).toHaveLength(MAX_RECENT_EXECUTIONS);
    expect(history[0]?.label).toBe('Search Google');
    expect(JSON.stringify(history)).not.toContain('private search text');
    expect(clearRecentExecutions()).toEqual([]);
  });
});
