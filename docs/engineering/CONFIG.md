# Configuration

`.env.example` lists only configuration currently recognized by the project:

- `VITE_API_BASE_URL`: public web build-time API base URL. Because it begins with `VITE_`, it is client/public and may be included in the browser bundle.
- `APP_ENV`: non-secret API runtime environment label.
- `APP_VERSION`: non-secret API build/version metadata.

There are no server-side secrets required by V1. Never commit `.env` files or service credentials. OAuth secrets, service tokens, and deployment credentials must remain outside client bundles and source control. Add configuration only with startup/build validation and accompanying documentation.
