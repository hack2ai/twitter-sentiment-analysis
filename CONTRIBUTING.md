# Contributing

Contributions are welcome.

## Before you start

1. Create a branch from the latest target branch.
2. Keep changes focused on one purpose.
3. Do not commit `.env` files, credentials, tokens, or local databases.
4. Update documentation when behavior or configuration changes.

## Local validation

### Backend

From `backend/`:

```bash
pip install -r requirements.txt
python -m compileall -q .
pytest -q
```

### Frontend

From `frontend/`:

```bash
npm ci
npm run lint
npm run build
```

## Pull requests

A pull request should:

- Explain what changed and why.
- Include tests when behavior changes.
- Keep authentication and ownership checks intact.
- Avoid unrelated formatting-only changes.
- Pass backend tests and frontend validation.

## Code quality

Prefer small, readable changes with explicit error handling. Validate user input at API boundaries, keep secrets in environment variables, and preserve user-level data isolation for authenticated resources.
