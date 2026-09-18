import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  forwardRef,
  useEffect,
  useRef,
} from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'quiet';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ className = '', type = 'button', variant = 'secondary', ...props }: ButtonProps) {
  return <button className={`button button-${variant} ${className}`.trim()} type={type} {...props} />;
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className = '', ...props },
  ref,
) {
  return <input className={`text-input ${className}`.trim()} ref={ref} {...props} />;
});

export function Card({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`card ${className}`.trim()} {...props} />;
}

export function KeyboardShortcutHint({ children }: { children: ReactNode }) {
  return <kbd className="keyboard-hint">{children}</kbd>;
}

export function Tooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="tooltip" aria-label={label} data-tooltip={label}>
      {children}
    </span>
  );
}

export function Toggle({
  children,
  pressed,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pressed: boolean; children: ReactNode }) {
  return (
    <Button className="toggle" aria-pressed={pressed} variant={pressed ? 'primary' : 'secondary'} {...props}>
      {children}
    </Button>
  );
}

export function Tabs({ children, label = 'Options' }: { children: ReactNode; label?: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {children}
    </div>
  );
}

export function Tab({ active, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <Button className="tab" role="tab" aria-selected={active} variant="quiet" {...props}>
      {children}
    </Button>
  );
}

export function Menu({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="menu" role="menu" aria-label={label}>
      {children}
    </div>
  );
}

export function CommandResult({
  active,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button className="command-result" role="option" aria-selected={active} type="button" {...props}>
      {children}
    </button>
  );
}

export interface DialogProps {
  children: ReactNode;
  label: string;
  onClose: () => void;
  open: boolean;
}

/** A small modal primitive with initial focus, Escape handling, and a contained Tab sequence. */
export function Dialog({ children, label, onClose, open }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        aria-label={label}
        aria-modal="true"
        className="dialog"
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
