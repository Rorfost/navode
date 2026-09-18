# Configuration

`.env.example` lists only configuration currently recognized by the project:

- `VITE_API_BASE_URL`: public web build-time API base URL.
- `APP_ENV`: API runtime environment label.
- `APP_VERSION`: API build/version metadata.

Never commit `.env` files or service credentials. Client-safe variables may appear in bundles; OAuth secrets, service tokens, and deployment credentials must never do so. Add configuration only with startup/build validation and accompanying documentation.
