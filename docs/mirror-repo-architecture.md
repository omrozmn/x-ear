# Mirror Repository Architecture

> **Document Type**: Architecture Documentation  
> **Last Updated**: December 2024  
> **Maintainers**: X-EAR Core Team

---

## Table of Contents

1. [Overview](#overview)
2. [Why Mirror Repository?](#why-mirror-repository)
3. [Architecture Diagram](#architecture-diagram)
4. [Synchronization Flow](#synchronization-flow)
5. [File Filtering Rules](#file-filtering-rules)
6. [Security Considerations](#security-considerations)
7. [Developer Workflows](#developer-workflows)
8. [Manual Operations](#manual-operations)
9. [Troubleshooting](#troubleshooting)
10. [Revoking Access](#revoking-access)
11. [Onboarding External Developers](#onboarding-external-developers)

---

## Overview

The X-EAR project uses a **mirror repository pattern** to safely share code with external developers while maintaining security and control over sensitive data.

### Key Concepts

| Repository | Purpose | Access |
|------------|---------|--------|
| `x-ear` (Main) | Full source code, secrets, internal docs | Internal team only |
| `x-ear-mirror` (Mirror) | Filtered, production-ready code | External developers |

### How It Works

```
┌─────────────────────┐                    ┌─────────────────────┐
│     MAIN REPO       │                    │    MIRROR REPO      │
│     (x-ear)         │                    │   (x-ear-mirror)    │
│                     │                    │                     │
│  ┌───────────────┐  │    Automated      │  ┌───────────────┐  │
│  │  Full Code    │  │      Sync         │  │ Filtered Code │  │
│  │  + Secrets    │──┼──────────────────▶│  │  (Safe)       │  │
│  │  + Internal   │  │    on push        │  │               │  │
│  │    Docs       │  │    to main        │  │               │  │
│  └───────────────┘  │                    │  └───────────────┘  │
│                     │                    │                     │
│  Access: Internal   │                    │  Access: External   │
│  Team Only          │                    │  Developers         │
└─────────────────────┘                    └─────────────────────┘
```

---

## Why Mirror Repository?

### Problems Solved

1. **Security**
   - Secrets and credentials never leave the main repository
   - Internal documentation stays private
   - Access can be revoked without affecting main repo

2. **Clean Codebase for Contributors**
   - External developers see only production-relevant code
   - No confusion from internal tooling or temp files
   - Clear separation of concerns

3. **Controlled Contribution Flow**
   - All external contributions go through PR review
   - Maintainers control what gets merged into main
   - History can be rewritten/squashed for cleaner mirror

4. **Compliance**
   - Meets requirements for code sharing agreements
   - Audit trail of what was shared
   - Easy to demonstrate what external parties can access

### Alternative Approaches Considered

| Approach | Why Not Used |
|----------|--------------|
| Branch-based access | Git doesn't support per-branch permissions |
| .gitattributes export-ignore | Only works for archives, not clones |
| Git submodules | Complex for contributors, sync issues |
| Mono-repo with access controls | GitHub/GitLab don't support file-level perms |

---

## Architecture Diagram

```
                              ┌──────────────────────────────────┐
                              │          MAIN REPOSITORY         │
                              │            (x-ear)               │
                              │                                  │
                              │  ┌────────────┐  ┌────────────┐  │
                              │  │ apps/      │  │ .env       │  │
                              │  │ backend    │  │ secrets    │  │
                              │  │ admin      │  │ internal/  │  │
                              │  │ web        │  │ ...        │  │
                              │  └────────────┘  └────────────┘  │
                              └──────────────┬───────────────────┘
                                             │
                                             │ Push to main
                                             ▼
                              ┌──────────────────────────────────┐
                              │      GITHUB ACTIONS WORKFLOW     │
                              │        mirror-sync.yml           │
                              │                                  │
                              │  1. Checkout source              │
                              │  2. Filter files (rsync)         │
                              │  3. Security scan                │
                              │  4. Generate metadata            │
                              │  5. Force push to mirror         │
                              └──────────────┬───────────────────┘
                                             │
                                             │ Filtered + Squashed
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           MIRROR REPOSITORY                                   │
│                          (x-ear-mirror)                                       │
│                                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ apps/       │  │ packages/   │  │ docs/       │  │ docker-     │         │
│  │ backend     │  │ core        │  │ (public)    │  │ compose.yml │         │
│  │ admin       │  │ ui-web      │  │             │  │             │         │
│  │ web         │  │ ui-native   │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                                               │
│  Excluded:                                                                    │
│  ✗ .env, secrets, credentials                                                 │
│  ✗ node_modules, .venv, caches                                                │
│  ✗ Internal documentation                                                     │
│  ✗ Build artifacts                                                            │
│  ✗ Database files                                                             │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │ EXTERNAL DEV 1    │           │ EXTERNAL DEV 2    │
        │                   │           │                   │
        │ 1. Fork mirror    │           │ 1. Fork mirror    │
        │ 2. Create branch  │           │ 2. Create branch  │
        │ 3. Submit PR      │           │ 3. Submit PR      │
        └─────────┬─────────┘           └─────────┬─────────┘
                  │                               │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────────┐
                    │    PR REVIEW IN MIRROR        │
                    │                               │
                    │  Maintainer reviews PR        │
                    │  If approved:                 │
                    │    → Cherry-pick to main      │
                    │    → Auto-sync updates mirror │
                    └───────────────────────────────┘
```

---

## Synchronization Flow

### Automatic Sync (Default)

The sync happens automatically on every push to `main`:

```yaml
# Trigger
on:
  push:
    branches:
      - main
```

### Sync Steps

1. **Checkout**: Full clone of main repository
2. **Filter**: rsync with exclusion rules
3. **Scan**: Check for accidentally included secrets
4. **Metadata**: Add sync timestamp and commit info
5. **Push**: Force push to mirror (history rewritten)

### Sync Timing

- **Automatic**: Within ~2-5 minutes of push to main
- **Manual**: Can be triggered via workflow dispatch
- **Scheduled**: Not enabled by default (can be added)

---

## File Filtering Rules

### Included (Whitelist Approach)

```
✓ apps/backend/         → Production backend code
✓ apps/admin/           → Admin panel frontend
✓ apps/web/             → Main web frontend
✓ apps/landing/         → Landing page
✓ packages/core/        → Shared TypeScript utilities
✓ packages/ui-web/      → Shared UI components
✓ packages/ui-native/   → React Native components
✓ scripts/              → Build/utility scripts (filtered)
✓ docs/                 → Public documentation
✓ openapi.yaml          → API specification
✓ docker-compose.yml    → Container configuration
✓ package.json          → Dependency manifest
✓ tsconfig.json         → TypeScript configuration
✓ .env.example          → Environment template
```

### Excluded

```
✗ .env, .env.*          → Environment secrets
✗ node_modules/         → Dependencies (installed locally)
✗ .venv/, venv/         → Python virtual environments
✗ __pycache__/          → Python bytecode
✗ dist/, build/         → Build outputs
✗ *.db, *.sqlite        → Database files
✗ instance/             → Flask instance folder
✗ .cache/               → Various caches
✗ *.log, *.pid          → Log and process files
✗ .paddleocr/           → ML model caches
✗ coverage/             → Test coverage reports
✗ *INTERNAL*, *SECRET*  → Internal documentation
✗ *.pem, *.key          → Private keys
```

### Pattern Details

The filtering uses rsync with exclusion patterns:

```bash
rsync -av \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='!.env.example' \  # Include .env.example
  --exclude='*.db' \
  ...
```

---

## Security Considerations

### Pre-Sync Security Scan

The workflow includes an automated security scan that checks for:

1. **Environment Files**: `.env`, `.env.local`, etc.
2. **API Keys**: Patterns like `api_key=`, `secret=`
3. **Private Keys**: `.pem`, `.key`, `.p12` files
4. **Hardcoded Secrets**: Common secret patterns in code

### What Happens If Secrets Are Detected?

```
ERROR: Secrets detected! Aborting sync.
```

The workflow will:
1. Stop immediately
2. Not push anything to mirror
3. Log the files that contain potential secrets
4. Alert maintainers

### Token Security

- `MIRROR_REPO_TOKEN`: Stored as GitHub secret
- Has only write access to mirror repo
- Cannot be used to access main repo
- Should be rotated periodically

---

## Developer Workflows

### Internal Developer (Has Main Access)

```bash
# Work in main repo
git clone https://github.com/omrozmn/x-ear.git
cd x-ear

# Make changes
git checkout -b feature/new-feature
# ... code ...
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create PR to main
# When merged → Mirror auto-syncs
```

### External Developer (Mirror Only)

```bash
# Fork mirror repo on GitHub
# Clone your fork
git clone https://github.com/YOUR-USERNAME/x-ear-mirror.git
cd x-ear-mirror

# Add upstream
git remote add upstream https://github.com/omrozmn/x-ear-mirror.git

# Create feature branch
git checkout -b feature/my-contribution

# Make changes
# ... code ...
git commit -m "feat: my contribution"
git push origin feature/my-contribution

# Create PR to mirror repo
# Wait for maintainer review
```

### Maintainer Reviewing External PR

```bash
# In main repo
git remote add mirror https://github.com/omrozmn/x-ear-mirror.git
git fetch mirror

# Create branch for the PR
git checkout -b review/external-pr-123

# Cherry-pick or manually apply changes
# ... review and test ...

# If approved, merge to main
git checkout main
git merge review/external-pr-123
git push origin main

# Mirror auto-syncs with merged changes
```

---

## Manual Operations

### Manual Sync Trigger

```bash
# Via GitHub CLI
gh workflow run mirror-sync.yml

# With dry run
gh workflow run mirror-sync.yml -f dry_run=true

# Via GitHub UI
# Go to Actions → Sync to Mirror Repository → Run workflow
```

### Manual Sync Script

```bash
# From main repo root
./scripts/sync-mirror.sh
```

### Force Re-sync

If the mirror gets out of sync:

```bash
# Delete mirror contents and re-sync
gh workflow run mirror-sync.yml -f force_sync=true
```

---

## Troubleshooting

### Sync Failed: Secrets Detected

**Cause**: The security scan found potential secrets.

**Solution**:
1. Check the workflow logs for flagged files
2. Remove the secrets from those files
3. Use environment variables instead
4. Re-run the workflow

### Sync Failed: Token Invalid

**Cause**: `MIRROR_REPO_TOKEN` expired or revoked.

**Solution**:
1. Generate a new Personal Access Token with `repo` scope
2. Update the secret in main repo settings
3. Re-run the workflow

### Mirror Out of Sync

**Cause**: Manual changes in mirror or failed syncs.

**Solution**:
```bash
# Force complete re-sync
gh workflow run mirror-sync.yml -f force_sync=true
```

### External PR Contains Sensitive Changes

**Cause**: External developer modified security-sensitive areas.

**Solution**:
1. Do NOT merge directly
2. Review carefully in an isolated environment
3. Request changes or close the PR
4. If needed, manually cherry-pick safe changes

---

## Revoking Access

### Revoking Individual Access

1. Go to mirror repo → Settings → Collaborators
2. Remove the collaborator
3. They lose access immediately
4. Their forks remain but can't submit PRs

### Revoking All External Access

1. Make mirror repo private
2. Or delete the mirror repo entirely
3. Generate new `MIRROR_REPO_TOKEN`
4. Update main repo secrets

### Emergency: Secrets Were Leaked

1. **Immediately** rotate all exposed credentials
2. Make mirror repo private
3. Delete mirror repo if necessary
4. Audit main repo for how leak occurred
5. Update filtering rules
6. Re-create mirror with fresh history

---

## Onboarding External Developers

### Step-by-Step Onboarding

1. **Create Their GitHub Account** (if needed)
   - Verify their identity
   - Document their contact info

2. **Grant Access to Mirror**
   ```
   Mirror repo → Settings → Collaborators → Add collaborator
   Permission level: Read (for cloning) or Triage (for issues)
   ```

3. **Share Documentation**
   - Point them to `CONTRIBUTING.md` in mirror
   - Share this architecture document if appropriate
   - Provide contact info for questions

4. **Onboarding Checklist**
   ```
   [ ] Developer has GitHub account
   [ ] Added as collaborator to mirror
   [ ] Shared CONTRIBUTING.md link
   [ ] Explained PR workflow
   [ ] Provided development environment setup guide
   [ ] Scheduled kickoff meeting (if needed)
   ```

### Developer Agreement (Recommended)

Before granting access, have developers acknowledge:

- Code is proprietary
- They can only submit contributions via PR
- They cannot share mirror access with others
- Access can be revoked at any time

---

## Maintenance Schedule

### Weekly
- [ ] Review pending PRs in mirror
- [ ] Check sync workflow health

### Monthly
- [ ] Audit mirror collaborator list
- [ ] Review filtering rules for new sensitive files
- [ ] Rotate `MIRROR_REPO_TOKEN`

### Quarterly
- [ ] Full security audit of mirror contents
- [ ] Review and update this documentation
- [ ] Clean up stale branches in mirror

---

## Related Documents

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contributor guidelines
- [Security Policy](./SECURITY.md) - Security procedures
- [Development Setup](./development-setup.md) - Local dev environment

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-12 | Initial documentation | X-EAR Team |

---

*This document is maintained in the main repository and synced to the mirror.*
