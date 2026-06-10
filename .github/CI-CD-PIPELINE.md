# CI/CD Pipeline Documentation

## Overview

The Hotel Management application uses a comprehensive CI/CD pipeline that automatically tests, builds, and deploys code on every push and pull request to `main` and `develop` branches.

## Pipeline Stages

### 1. **Validation Stage** ✓
Runs on every push and PR:
- **Dependency Check**: Scans `package-lock.json` for vulnerabilities (moderate level and above)
- **Linting**: Validates code style for both frontend and backend

### 2. **Build Stage** 🏗️
Builds and verifies both applications:
- **Frontend Build** (Vite):
  - Installs dependencies
  - Runs production build
  - Verifies `dist/` output exists
  - Uploads artifacts (5-day retention)

- **Backend Build** (Node.js):
  - Installs dependencies
  - Validates syntax with `node -c`
  - Verifies startup without errors
  - Uploads artifacts (5-day retention)

### 3. **Docker Stage** 🐳
Containerizes the backend service:
- Builds Docker image with BuildKit
- Caches layers for faster rebuilds
- Pushes to GitHub Container Registry on `main` branch and releases
- Validates Docker Compose configuration

### 4. **Security Stage** 🔒
Scans for vulnerabilities:
- **Trivy Scanner**: File system vulnerability scan
- Results uploaded to GitHub Security tab
- Non-blocking (allows pipeline to continue)

### 5. **Publish Stage** 📦
Publishes packages only on release:
- Triggers when a GitHub release is created
- Downloads all build artifacts
- Publishes to GitHub Packages registry

### 6. **Pipeline Status** 📊
Final check that aggregates all job results.

## Triggers

The pipeline runs in these scenarios:

| Event | Branches | Action |
|-------|----------|--------|
| Push | `main`, `develop` | Run full pipeline (validation → build → security) |
| Pull Request | `main`, `develop` | Run full pipeline for code review |
| Release Created | Any | Run full pipeline + publish to npm packages |

## GitHub Actions Badge

The pipeline status is displayed as a badge in the README:

```markdown
[![CI/CD Pipeline](https://github.com/rufoabrahamguyo/hotel-management/actions/workflows/ci-cd-pipeline.yml/badge.svg?branch=main)](https://github.com/rufoabrahamguyo/hotel-management/actions/workflows/ci-cd-pipeline.yml)
```

- Green badge = All checks passing ✅
- Red badge = Pipeline failed ❌
- Click the badge to see detailed logs

## Monitoring Your Pipeline

1. **Go to Actions tab**: https://github.com/rufoabrahamguyo/hotel-management/actions
2. **View workflow runs**: See all CI/CD pipeline executions
3. **Click a workflow run**: View detailed logs for each job
4. **Check failed jobs**: Expand the job to see error messages

## Local Testing (Optional)

Before pushing, test locally:

```bash
# Lint frontend
npm run lint --prefix frontend

# Build frontend
npm run build --prefix frontend

# Lint backend (if script exists)
npm run lint --prefix backend

# Build and test backend
npm run dev --prefix backend
```

## Performance Tips

- Pipeline typically completes in **2-4 minutes**
- Node dependencies are cached between runs
- Docker layers are cached in GitHub Actions
- Artifacts retained for 5 days for debugging

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Lint failures | Check ESLint errors in the Actions log |
| Build failures | Ensure `npm ci` installs all deps correctly |
| Docker push fails | Verify `GITHUB_TOKEN` has write permissions |
| Security scan warnings | Review results in GitHub Security tab |

## Configuration Files

- **Pipeline definition**: `.github/workflows/ci-cd-pipeline.yml`
- **Frontend config**: `frontend/eslint.config.js`, `frontend/vite.config.js`
- **Backend config**: `backend/package.json`
- **Docker config**: `backend/Dockerfile`, `docker-compose.yml`

## Next Steps

To extend the pipeline, consider:
- ✨ Add unit/integration tests
- ✨ Add code coverage reporting
- ✨ Deploy to staging environment
- ✨ Add performance benchmarks
