# Requirements

## Functional requirements

| ID     | Requirement                                                                           |
| ------ | ------------------------------------------------------------------------------------- |
| FR-001 | Provide a keyboard-operable command palette that parses and runs configured commands. |
| FR-002 | Provide editable quick links and project/workspace launchers.                         |
| FR-003 | Provide a local scratchpad and focus timer.                                           |
| FR-004 | Persist personal configuration locally by default.                                    |
| FR-005 | Support safe, versioned configuration import and export.                              |
| FR-006 | The Chrome extension must override the new-tab page using Manifest V3.                |
| FR-007 | Support customizable command aliases and shortcuts.                                   |

## Non-functional requirements

| ID      | Requirement                                                                                                                   |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| NFR-001 | The new-tab UI must become usable without waiting for an API.                                                                 |
| NFR-002 | Keyboard access, visible focus, semantic controls, and reduced-motion support are baseline accessibility requirements.        |
| NFR-003 | Browser permissions must be minimal and documented.                                                                           |
| NFR-004 | Untrusted imports and URLs must be validated before use.                                                                      |
| NFR-005 | Core behavior must be testable outside React and Chrome APIs where practical.                                                 |
| NFR-006 | The codebase must remain maintainable through strict TypeScript, focused modules, and documented boundaries.                  |
| NFR-007 | Local data must be protected from unnecessary network transmission and production logs must not expose private configuration. |

Chrome is the initial extension target; the web app should work in current evergreen browsers.
