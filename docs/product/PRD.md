# Product requirements document

## Overview and problem

Navode is a personal browser command center. It reduces the friction between an intention and a digital action: users should not need to hunt through bookmarks, tabs, or service menus for repetitive work.

## Vision and users

The primary user is an individual who works in a browser daily: students, developers, competitive programmers, and knowledge workers with repeated destinations and workflows. Navode should be a fast, keyboard-first, local-first new-tab experience that works without an account.

## Principles

Fast, privacy-conscious, configurable, visually calm, modular, and useful offline. Navode is not a bookmark manager, project-management suite, Notion clone, browser, or AI-dependent product.

## V1 scope

V1 will provide a new-tab command bar, quick links, local settings, keyboard shortcuts, scratchpad, focus timer, basic project launcher, configurable commands, and import/export. The present repository implements only the shared interface shell and the beginnings of command parsing.

## Later releases and ideas

Power-user workspaces, snippets, session groups, developer utilities, GitHub/Codeforces/calendar/service-health integrations, and optional cross-device sync are future phases. They are not commitments.

## Privacy and UX expectations

Personal configuration remains local by default. Sync and integrations require explicit opt-in. Initial rendering must not wait for network calls; command-palette use must be fully keyboard operable with visible focus and understandable errors.

## Success criteria and release phases

Success means a user can reach common tools and workflows faster than manual navigation, with settings they control. Phase 0 is the repository foundation; Phase 1 is a useful new tab; later phases add power-user features, integrations, sync, and public-product readiness.
