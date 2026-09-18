# Security

Navode treats workflow configuration as sensitive personal data. Keep it local by default and do not add hidden telemetry. The extension starts with no runtime permissions, uses an MV3 CSP, and must not add broad host, history, tabs, or scripting permissions without a documented feature need.

Validate imported data and all externally opened URLs. Reject `javascript:`, `data:`, and other unsafe schemes unless a narrowly designed feature requires one. Render user text safely, avoid unsafe HTML, redact tokens from logs, evaluate OAuth storage carefully, and review third-party dependencies for maintenance and supply-chain risk. Configurable commands must never become an arbitrary code-execution mechanism.
