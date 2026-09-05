# Security Policy

## Supported versions

Security fixes are intended for the latest maintained branch of this project.

## Reporting a vulnerability

Please do not publish sensitive vulnerability details in a public issue.

Report security concerns privately to the repository maintainer through the repository's available private contact channel. Include:

- A clear description of the vulnerability.
- The affected component or endpoint.
- Reproduction steps or a minimal proof of concept.
- The potential security impact.
- Any suggested mitigation, when known.

Please avoid including real credentials, access tokens, personal data, or production secrets in reports.

## Security practices

The application is designed to use environment variables for secrets, authenticated endpoints for private analysis history, password hashing, signed access tokens, authentication rate limiting, input validation, and non-root Docker execution.

Production deployments should use a strong unique `SECRET_KEY`, HTTPS, a restricted `FRONTEND_ORIGIN`, persistent database storage, and appropriately protected infrastructure secrets.
