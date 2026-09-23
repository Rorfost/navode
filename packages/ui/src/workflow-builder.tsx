import { useState } from 'react';
import {
  validateWorkflow,
  type Workflow,
  type WorkflowActionKind,
  type WorkflowApprovalPolicy,
  type WorkflowStep,
} from '@navode/core';
import { Button, Dialog, TextInput } from './primitives';

export interface WorkflowBuilderProps {
  workflow: Workflow | null;
  isOpen: boolean;
  onSave: (workflow: Workflow) => void;
  onClose: () => void;
}

export function WorkflowBuilder({
  workflow: initialWorkflow,
  isOpen,
  onSave,
  onClose,
}: WorkflowBuilderProps) {
  const [name, setName] = useState(initialWorkflow?.name || 'New Workflow');
  const [description, setDescription] = useState(initialWorkflow?.description || '');
  const [category, setCategory] = useState(initialWorkflow?.category || 'Custom');
  const [approvalPolicy, setApprovalPolicy] = useState<WorkflowApprovalPolicy>(
    initialWorkflow?.approvalPolicy || 'on-high-impact',
  );
  const [commandAlias, setCommandAlias] = useState(
    initialWorkflow?.triggers?.find((t) => t.kind === 'command')?.commandAlias || '',
  );
  const [steps, setSteps] = useState<WorkflowStep[]>(initialWorkflow?.steps || []);

  const handleAddStep = () => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      name: 'Open Link',
      actionKind: 'open-url',
      params: { url: 'https://' },
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const handleUpdateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setSteps(
      steps.map((s) => {
        if (s.id === id) {
          return { ...s, ...updates };
        }
        return s;
      }),
    );
  };

  const handleSave = () => {
    const updated: Workflow = {
      id: initialWorkflow?.id || `wf_${Date.now()}`,
      name,
      description,
      category,
      enabled: initialWorkflow?.enabled ?? true,
      approvalPolicy,
      triggers: [
        {
          kind: 'command',
          commandAlias: commandAlias.trim(),
          enabled: true,
        },
      ],
      variables: initialWorkflow?.variables || [],
      steps,
      createdAt: initialWorkflow?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const validation = validateWorkflow(updated);
    if (!validation.valid) {
      alert(validation.errors.join('\n'));
      return;
    }

    onSave(updated);
    onClose();
  };

  const validation = validateWorkflow({
    id: 'preview',
    name,
    description,
    enabled: true,
    approvalPolicy,
    triggers: [],
    variables: [],
    steps,
    createdAt: '',
    updatedAt: '',
  });

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      label={initialWorkflow ? 'Edit Workflow' : 'Create Workflow'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#f8fafc' }}>
        <div>
          <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Workflow Name</label>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning Routine"
          />
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Description</label>
          <TextInput
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this workflow does..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Command Macro Alias</label>
            <TextInput
              value={commandAlias}
              onChange={(e) => setCommandAlias(e.target.value)}
              placeholder="e.g. run morning"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Approval Policy</label>
            <select
              value={approvalPolicy}
              onChange={(e) => setApprovalPolicy(e.target.value as WorkflowApprovalPolicy)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                color: '#fff',
                padding: '0.5rem',
                fontSize: '0.88rem',
              }}
            >
              <option value="on-high-impact">On High Impact (≥3 tabs)</option>
              <option value="always">Always Request Approval</option>
              <option value="never">Never Request Approval</option>
            </select>
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Workflow Steps ({steps.length})</h4>
            <Button variant="secondary" onClick={handleAddStep}>
              + Add Step
            </Button>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '240px',
              overflowY: 'auto',
            }}
          >
            {steps.map((step, idx) => (
              <div
                key={step.id}
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>
                  #{idx + 1}
                </span>
                <TextInput
                  value={step.name}
                  onChange={(e) => handleUpdateStep(step.id, { name: e.target.value })}
                  placeholder="Step Name"
                />
                <select
                  value={step.actionKind}
                  onChange={(e) =>
                    handleUpdateStep(step.id, { actionKind: e.target.value as WorkflowActionKind })
                  }
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '0.35rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value="open-url">Open URL</option>
                  <option value="start-focus-timer">Start Focus Timer</option>
                  <option value="notification">Notification</option>
                  <option value="refresh-integration">Refresh Integration</option>
                  <option value="copy-snippet">Copy Snippet</option>
                  <option value="update-today-item">Add Today Item</option>
                </select>
                <Button variant="quiet" onClick={() => handleRemoveStep(step.id)}>
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </div>

        {validation.warnings.length > 0 && (
          <div style={{ color: '#fde047', fontSize: '0.8rem' }}>
            ⚠️ {validation.warnings.join(' ')}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Workflow
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
