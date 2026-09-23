import type { ContextSuggestion } from '@navode/core';
import { Button } from './primitives';

export interface ContextSuggestionsBannerProps {
  suggestions: ContextSuggestion[];
  onAction: (suggestion: ContextSuggestion) => void;
  onDismiss: (suggestionId: string) => void;
}

export function ContextSuggestionsBanner({
  suggestions,
  onAction,
  onDismiss,
}: ContextSuggestionsBannerProps) {
  if (!suggestions || suggestions.length === 0 || !suggestions[0]) return null;

  const topSuggestion = suggestions[0];

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85))',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        padding: '0.85rem 1.25rem',
        margin: '0 0 1rem 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '1.1rem',
          }}
        >
          💡
        </div>
        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc' }}>
            {topSuggestion.title}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{topSuggestion.description}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Button variant="primary" onClick={() => onAction(topSuggestion)}>
          Run Action
        </Button>
        <Button variant="quiet" onClick={() => onDismiss(topSuggestion.id)}>
          ✕
        </Button>
      </div>
    </div>
  );
}
