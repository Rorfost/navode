import {
  createProject,
  createProjectAction,
  createQuickLink,
  createWorkspace,
  createWorkspaceItem,
  createWorkspaceLaunchPlan,
  DEFAULT_NAVODE_SETTINGS,
  migrateV1Settings,
  parseNavodeSettings,
  removeQuickLink,
  removeProject,
  removeProjectAction,
  removeWorkspace,
  removeWorkspaceItem,
  reorderQuickLinks,
  saveProjectAction,
  saveWorkspaceItem,
  updateProject,
  updateQuickLink,
  updateWorkspace,
} from '../src/index';

import { describe, expect, it } from 'vitest';

describe('quick links', () => {
  it('creates, updates, deletes, reorders, and validates links', () => {
    const docs = createQuickLink(
      { alias: 'docs', name: 'Docs', url: 'https://example.com/docs' },
      'docs',
      0,
    )!;
    const tasks = createQuickLink({ name: 'Tasks', url: 'https://example.com/tasks' }, 'tasks', 1)!;

    expect(
      updateQuickLink([docs, tasks], 'docs', {
        alias: 'docs',
        name: 'Documentation',
        url: 'https://example.com/docs',
      })?.[0],
    ).toMatchObject({ id: 'docs', name: 'Documentation' });
    expect(reorderQuickLinks([docs, tasks], ['tasks', 'docs']).map((link) => link.id)).toEqual([
      'tasks',
      'docs',
    ]);
    expect(removeQuickLink([docs, tasks], 'docs')).toEqual([{ ...tasks, order: 0 }]);
    expect(createQuickLink({ name: 'Unsafe', url: 'javascript:alert(1)' }, 'unsafe', 2)).toBeNull();
    expect(
      updateQuickLink([docs], 'docs', { alias: 'bad alias', name: 'Docs', url: docs.url }),
    ).toBeNull();
  });
});

describe('projects and workspaces', () => {
  it('stores editable project actions with validated URLs', () => {
    const project = createProject(
      { name: 'Documentation site', description: 'Generic example' },
      'project-1',
    )!;
    const action = createProjectAction(
      { kind: 'docs', label: 'Open docs', url: 'https://example.com/docs' },
      'action-1',
    )!;

    expect(saveProjectAction([project], project.id, action)).toEqual([
      { ...project, actions: [action] },
    ]);
    const withAction = saveProjectAction([project], project.id, action)!;
    expect(updateProject(withAction, project.id, { name: 'Renamed site' })).toMatchObject([
      { name: 'Renamed site' },
    ]);
    expect(removeProjectAction(withAction, project.id, action.id)[0]?.actions).toEqual([]);
    expect(removeProject(withAction, project.id)).toEqual([]);
    expect(
      createProjectAction(
        { kind: 'custom', label: 'Unsafe', url: 'data:text/html,nope' },
        'unsafe',
      ),
    ).toBeNull();
  });

  it('builds a deliberate workspace launch plan from valid items', () => {
    const workspace = createWorkspace({ name: 'Morning' }, 'morning', 0)!;
    const news = createWorkspaceItem({ label: 'News', url: 'https://example.com/news' }, 'news')!;
    const mail = createWorkspaceItem({ label: 'Mail', url: 'https://example.com/mail' }, 'mail')!;
    const saved = saveWorkspaceItem([workspace], workspace.id, news)!;
    const complete = saveWorkspaceItem(saved, workspace.id, mail)!;

    expect(createWorkspaceLaunchPlan(complete[0]!)).toEqual({
      label: 'Morning',
      urls: ['https://example.com/news', 'https://example.com/mail'],
      workspaceId: 'morning',
    });
    expect(updateWorkspace(complete, workspace.id, { name: 'Evening' })).toMatchObject([
      { name: 'Evening' },
    ]);
    expect(removeWorkspaceItem(complete, workspace.id, news.id)[0]?.items).toEqual([mail]);
    expect(removeWorkspace(complete, workspace.id)).toEqual([]);
  });
});

describe('organizational settings migration', () => {
  it('migrates v1 settings to the current schema without losing prior preferences', () => {
    const migrated = migrateV1Settings({
      schemaVersion: 1,
      theme: 'light',
      onboardingCompleted: true,
      defaultSearchProvider: 'youtube',
      initialQuickLinks: true,
      customAliases: [],
      recentExecutions: [],
    });

    expect(migrated).toMatchObject({
      schemaVersion: 5,
      theme: 'light',
      defaultSearchProvider: 'youtube',
      projects: [],
      workspaces: [],
    });
    expect(migrated.quickLinks.map((link) => link.name)).toEqual(['Google', 'YouTube', 'GitHub']);
    expect(DEFAULT_NAVODE_SETTINGS.schemaVersion).toBe(5);
    expect(parseNavodeSettings({ schemaVersion: 1, initialQuickLinks: false }).quickLinks).toEqual(
      [],
    );
  });
});
