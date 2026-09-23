import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_WORKFLOW_TEMPLATES,
  executeStep,
  requiresUserApproval,
  runWorkflowExecution,
  validateWorkflow,
  type Workflow,
} from '../src/workflow';

describe('Workflow Execution Engine', () => {
  it('validates default workflow templates without errors', () => {
    for (const template of DEFAULT_WORKFLOW_TEMPLATES) {
      const validation = validateWorkflow(template);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    }
  });

  it('detects invalid URL schemes and step bounds', () => {
    const invalidWorkflow: Workflow = {
      id: 'bad-wf',
      name: 'Bad Workflow',
      description: 'Invalid url step',
      enabled: true,
      triggers: [],
      variables: [],
      steps: [
        {
          id: 's1',
          name: 'Bad URL',
          actionKind: 'open-url',
          params: { url: 'ftp://unsafe-link.com' },
        },
      ],
      approvalPolicy: 'never',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const validation = validateWorkflow(invalidWorkflow);
    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain('invalid URL scheme');
  });

  it('requires user approval when tab threshold is met under on-high-impact policy', () => {
    const multiTabWorkflow: Workflow = {
      id: 'multi-tab',
      name: 'Multi Tab Launcher',
      description: 'Opens many tabs',
      enabled: true,
      triggers: [],
      variables: [],
      steps: [
        { id: '1', name: 'Tab 1', actionKind: 'open-url', params: { url: 'https://site1.com' } },
        { id: '2', name: 'Tab 2', actionKind: 'open-url', params: { url: 'https://site2.com' } },
        { id: '3', name: 'Tab 3', actionKind: 'open-url', params: { url: 'https://site3.com' } },
      ],
      approvalPolicy: 'on-high-impact',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const check = requiresUserApproval(multiTabWorkflow);
    expect(check.requiresApproval).toBe(true);
    expect(check.reason).toContain('3 browser tabs');
  });

  it('executes workflow steps and handles context handlers', async () => {
    const openUrl = vi.fn();
    const startFocusTimer = vi.fn();

    const template = DEFAULT_WORKFLOW_TEMPLATES[0]!; // Start Work
    const result = await runWorkflowExecution(template, 'manual', {
      openUrl,
      startFocusTimer,
      userApproved: true,
    });

    expect(result.status).toBe('success');
    expect(openUrl).toHaveBeenCalledWith('https://github.com');
    expect(startFocusTimer).toHaveBeenCalledWith(50);
  });
});
