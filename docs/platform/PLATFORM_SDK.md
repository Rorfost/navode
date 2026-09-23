# Navode Platform SDK

The Navode Platform SDK (`@navode/platform-sdk`) allows developers to extend Navode with custom commands, themes, and integrations.

## Installation

```bash
npm install @navode/platform-sdk
```

## Creating a Plugin Manifest

Plugins are declared via a static JSON manifest. Due to Chrome Extension MV3 restrictions, plugins cannot execute arbitrary remote code or inline scripts.

```json
{
  "id": "my-custom-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Does something cool.",
  "publisher": "Acme Corp",
  "compatiblePlatformApiVersion": 1,
  "capabilities": ["storage:read", "commands:register"],
  "commands": [
    {
      "id": "cool-action",
      "label": "Do something cool",
      "action": {
        "type": "open-url",
        "url": "https://example.com"
      }
    }
  ]
}
```

## Security Model

Plugins only have access to the capabilities they declare in their manifest. The Navode Platform SDK validates manifests strictly.
