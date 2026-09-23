import { describe, expect, it } from 'vitest';
import { generateAIProposal } from '../src/ai-assistant';

describe('AI Assistant Proposals', () => {
  it('generates a focus workflow proposal from natural language prompt', () => {
    const proposal = generateAIProposal({ userPrompt: 'Start a 60 minute focus sprint' });

    expect(proposal.type).toBe('workflow-proposal');
    if (proposal.type === 'workflow-proposal') {
      expect(proposal.proposalTitle).toContain('60-Minute Focus');
      expect(proposal.workflow.steps).toBeDefined();
      expect(proposal.workflow.steps!).toHaveLength(2);
      expect(proposal.workflow.steps![0]!.params.durationMinutes).toBe(60);
    }
  });
});
