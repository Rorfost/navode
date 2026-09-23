import type { Workflow, WorkflowStep } from './workflow';

export interface AIProposalRequest {
  userPrompt: string;
  context?: {
    availableProjects?: string[];
    availableWorkspaces?: string[];
  };
}

export interface AIWorkflowProposal {
  type: 'workflow-proposal';
  proposalTitle: string;
  explanation: string;
  workflow: Partial<Workflow>;
}

export interface AICommandProposal {
  type: 'command-proposal';
  proposalTitle: string;
  commandAlias: string;
  targetWorkflowId: string;
}

export type AIProposal = AIWorkflowProposal | AICommandProposal;

/**
 * Generates an interactive workflow/command proposal from a natural language user prompt.
 * Ensures safety: AI ONLY produces proposals for user approval.
 */
export function generateAIProposal(request: AIProposalRequest): AIProposal {
  const prompt = request.userPrompt.toLowerCase().trim();

  if (prompt.includes('focus') || prompt.includes('study') || prompt.includes('pomodoro')) {
    const minutesMatch = prompt.match(/\b(\d{1,3})\s*(?:minutes?|min|m)\b/);
    const durationMinutes = minutesMatch && minutesMatch[1] ? parseInt(minutesMatch[1], 10) : 45;

    return {
      type: 'workflow-proposal',
      proposalTitle: `Proposed Workflow: ${durationMinutes}-Minute Focus Sprint`,
      explanation: `Created a focused routine with a ${durationMinutes}-minute focus timer and notifications.`,
      workflow: {
        name: `Focus Sprint (${durationMinutes}m)`,
        description: `Natural language generated focus workflow (${durationMinutes} minutes).`,
        enabled: true,
        approvalPolicy: 'never',
        triggers: [{ kind: 'command', commandAlias: `focus ${durationMinutes}`, enabled: true }],
        steps: [
          {
            id: 'step-focus-1',
            name: `Start ${durationMinutes}m Focus Timer`,
            actionKind: 'start-focus-timer',
            params: { durationMinutes },
          },
          {
            id: 'step-focus-2',
            name: 'Notify Sprint Active',
            actionKind: 'notification',
            params: { title: 'Focus Sprint', message: `${durationMinutes} minute timer started.` },
          },
        ],
      },
    };
  }

  if (prompt.includes('morning') || prompt.includes('start day') || prompt.includes('daily')) {
    return {
      type: 'workflow-proposal',
      proposalTitle: 'Proposed Workflow: Daily Morning Routine',
      explanation:
        'Set up an automated morning workflow to sync integrations and prepare your day.',
      workflow: {
        name: 'Morning Kickoff',
        description: 'Syncs GitHub & Calendar every morning.',
        enabled: true,
        approvalPolicy: 'never',
        triggers: [
          { kind: 'schedule', cronSchedule: '0 9 * * 1-5', enabled: true },
          { kind: 'command', commandAlias: 'morning', enabled: true },
        ],
        steps: [
          {
            id: 'step-morning-1',
            name: 'Refresh Calendar',
            actionKind: 'refresh-integration',
            params: { providerId: 'google-calendar' },
          },
          {
            id: 'step-morning-2',
            name: 'Refresh GitHub',
            actionKind: 'refresh-integration',
            params: { providerId: 'github' },
          },
        ],
      },
    };
  }

  // Default fallback proposal
  return {
    type: 'workflow-proposal',
    proposalTitle: `Proposed Workflow: Custom Action`,
    explanation: `Generated a customizable workflow step based on "${request.userPrompt}".`,
    workflow: {
      name: 'Custom Workflow',
      description: request.userPrompt,
      enabled: true,
      approvalPolicy: 'on-high-impact',
      triggers: [{ kind: 'command', commandAlias: 'custom', enabled: true }],
      steps: [
        {
          id: 'step-custom-1',
          name: 'Open Link',
          actionKind: 'open-url',
          params: { url: 'https://github.com' },
        },
      ],
    },
  };
}
