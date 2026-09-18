# Code rules

- Use strict TypeScript; `any`, disabled lint rules, and untyped external data require a documented reason.
- Prefer focused files, functions, and components over abstractions created for hypothetical reuse.
- Use clear names, validate inputs at boundaries, and handle async failures intentionally.
- Core behavior belongs outside presentation components. Keep extension/browser APIs behind adapters where practical.
- Comments explain non-obvious reasoning, never obvious syntax. Remove dead code and unscoped TODOs.
- Use package-local imports and promote UI only after real reuse exists.
- Do not log tokens, secrets, imported private data, or noisy production debug information.
- Use semantic HTML, accessible labels, keyboard navigation, and visible focus states.
