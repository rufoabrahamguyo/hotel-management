Local CI / test steps

Run these commands from the repository root to reproduce what GitHub Actions does for CI.

Install backend dependencies and run backend lint + tests:

```bash
npm ci --prefix backend
npm run lint --prefix backend
npm test --prefix backend
```

Install frontend dependencies and run frontend lint + build:

```bash
npm ci --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

You can run both sections together:

```bash
npm ci --prefix backend && npm ci --prefix frontend && npm run lint --prefix frontend && npm run lint --prefix backend && npm run build --prefix frontend && npm test --prefix backend
```
