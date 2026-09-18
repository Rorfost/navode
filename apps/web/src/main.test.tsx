import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NavodeShell } from '@navode/ui';

describe('Navode shell', () => {
  it('submits a keyboard-entered command', () => {
    const onCommand = vi.fn();
    render(<NavodeShell onCommand={onCommand} />);

    fireEvent.change(screen.getByLabelText('What do you want to do?'), {
      target: { value: 'yt segment tree' },
    });
    fireEvent.submit(screen.getByRole('form', { name: 'Run a Navode command' }));

    expect(onCommand).toHaveBeenCalledWith('yt segment tree');
  });
});
