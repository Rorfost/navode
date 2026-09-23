# Navode Public API

The Navode core exposes specific types and APIs to the `@navode/platform-sdk`.

## Manifest Model

```typescript
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  publisher: string;
  compatiblePlatformApiVersion: number;
  capabilities: PlatformCapability[];
  commands?: Array<{
    id: string;
    label: string;
    action: CommandAction;
  }>;
  themes?: Array<{
    id: string;
    name: string;
    tokens: Record<string, string>;
  }>;
}
```

## Plugin Registry

```typescript
export interface PluginRegistryEntry {
  id: string;
  version: string;
  name: string;
  description: string;
  publisher: string;
  compatiblePlatformApiVersion: number;
  capabilities: PlatformCapability[];
  status: 'official' | 'community' | 'unverified';
  enabled: boolean;
  manifest: PluginManifest;
}
```

The SDK provides `validatePluginManifest(manifest: unknown)` to ensure a manifest conforms to the required schema.
