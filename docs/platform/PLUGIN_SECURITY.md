# Plugin Security & Sandboxing

Navode enforces a strict security model to ensure user privacy and performance.

## Zero Remote Execution

Because Navode can run as a Chrome Extension, it complies fully with Manifest V3 policies. This means:

- No `eval()` or `new Function()`.
- No remote code injection.
- Plugins are strictly declarative JSON manifests.

## Capability-Based Permissions

Plugins must declare their required capabilities upfront. The platform will only grant the requested capabilities, and users must approve them upon installation.

Available capabilities:

- `storage:read`
- `storage:write`
- `commands:register`
- `theme:override`
- `integrations:read`
- `integrations:write`

## Data Privacy

Plugins cannot exfiltrate data. Network requests are handled by the core platform using standard actions (like `fetch` commands), ensuring the platform can audit and enforce CSP rules.
