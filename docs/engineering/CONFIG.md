# Configuration

`.env.example` lists only configuration currently recognized by the project:

- `VITE_API_BASE_URL`: public web build-time API base URL. Because it begins with `VITE_`, it is client/public and may be included in the browser bundle.
- `APP_ENV`: non-secret API runtime environment label.
- `APP_VERSION`: non-secret API build/version metadata.

There are no server-side secrets required by V1. Never commit `.env` files or service credentials. OAuth secrets, service tokens, and deployment credentials must remain outside client bundles and source control. Add configuration only with startup/build validation and accompanying documentation.

## Project health

Project health has no endpoint, token, or server configuration. The extension asks Chrome for the exact origin of each saved health URL; the broad optional-host declaration exists solely to let Chrome grant that exact, user-selected origin at runtime. Navode does not request access to all sites as part of installation.

## Google Calendar extension authorization

V2.3 uses Chrome's official identity flow with only the `calendar.events.readonly` scope. Before a production Calendar-enabled extension can be distributed, register the production extension OAuth client in Google Cloud and add its public client ID to the extension manifest's `oauth2` configuration. The OAuth client ID is public configuration, but it must match the final extension ID; do not commit a client secret or placeholder ID. The extension requests `identity` and `https://www.googleapis.com/*` only after the user selects Connect Google Calendar.
