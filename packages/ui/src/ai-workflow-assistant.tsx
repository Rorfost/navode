import { useState } from 'react';
import { generateAIProposal, type AIProposal, type Workflow } from '@navode/core';
import { Button, Dialog, TextInput } from './primitives';

export interface AIWorkflowAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onAcceptProposal: (workflow: Workflow) => void;
}

export function AIWorkflowAssistant({
  isOpen,
  onClose,
  onAcceptProposal,
}: AIWorkflowAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [proposal, setProposal] = useState<AIProposal | null>(null);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    const result = generateAIProposal({ userPrompt: prompt });
    setProposal(result);
  };

  const handleSaveProposal = () => {
    if (!proposal || proposal.type !== 'workflow-proposal') return;

    const fullWorkflow: Workflow = {
      id: `wf_${Date.now()}`,
      name: proposal.workflow.name || 'AI Generated Workflow',
      description: proposal.workflow.description || prompt,
      enabled: true,
      approvalPolicy: proposal.workflow.approvalPolicy || 'on-high-impact',
      triggers: proposal.workflow.triggers || [
        { kind: 'command', commandAlias: 'ai-custom', enabled: true },
      ],
      variables: proposal.workflow.variables || [],
      steps: proposal.workflow.steps || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAcceptProposal(fullWorkflow);
    setPrompt('');
    setProposal(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} label="🤖 AI Workflow Generator">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#f8fafc' }}>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>
          Describe what you want to automate in plain English. The AI will generate a proposal for
          you to inspect and review before saving.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <TextInput
            placeholder="e.g. Every morning open my work links and start a 45 min focus sprint..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button variant="primary" onClick={handleGenerate}>
            Generate
          </Button>
        </div>

        {proposal && proposal.type === 'workflow-proposal' && (
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '0.5rem',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#60a5fa' }}>{proposal.proposalTitle}</h4>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
              {proposal.explanation}
            </p>

            <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              <strong>Steps ({proposal.workflow.steps?.length || 0}):</strong>
              <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem' }}>
                {proposal.workflow.steps?.map((step) => (
                  <li key={step.id}>
                    {step.name} ({step.actionKind})
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setProposal(null)}>
                Discard
              </Button>
              <Button variant="primary" onClick={handleSaveProposal}>
                Accept & Save Workflow
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
