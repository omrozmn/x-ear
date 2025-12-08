# Mirror Repository Setup Instructions

This document provides step-by-step instructions for setting up the mirror repository system.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create the Mirror Repository](#step-1-create-the-mirror-repository)
3. [Step 2: Generate a Personal Access Token](#step-2-generate-a-personal-access-token)
4. [Step 3: Add the Token to Main Repository Secrets](#step-3-add-the-token-to-main-repository-secrets)
5. [Step 4: Configure Branch Protection (Mirror)](#step-4-configure-branch-protection-mirror)
6. [Step 5: Test the Sync](#step-5-test-the-sync)
7. [Step 6: Onboard External Developers](#step-6-onboard-external-developers)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- [ ] Admin access to the main repository (`x-ear`)
- [ ] GitHub account with ability to create repositories
- [ ] GitHub CLI installed (optional, for easier setup)

---

## Step 1: Create the Mirror Repository

### Option A: GitHub Web Interface

1. Go to [github.com/new](https://github.com/new)

2. Fill in the repository details:
   ```
   Repository name: x-ear-mirror
   Description: Read-only mirror of X-EAR project for external contributors
   Visibility: Private (or Public, depending on your needs)
   ```

3. **Important Settings:**
   - [ ] Do NOT initialize with README
   - [ ] Do NOT add .gitignore
   - [ ] Do NOT add license

4. Click "Create repository"

### Option B: GitHub CLI

```bash
# Create private mirror repository
gh repo create omrozmn/x-ear-mirror \
  --private \
  --description "Read-only mirror of X-EAR project for external contributors"

# Or create public mirror
gh repo create omrozmn/x-ear-mirror \
  --public \
  --description "Read-only mirror of X-EAR project for external contributors"
```

### After Creation

Initialize with an empty commit (required for first sync):

```bash
# Clone the empty repository
git clone https://github.com/omrozmn/x-ear-mirror.git
cd x-ear-mirror

# Create initial commit
echo "# X-EAR Mirror" > README.md
git add README.md
git commit -m "Initial commit"
git push origin main
```

---

## Step 2: Generate a Personal Access Token

The GitHub Action needs a token to push to the mirror repository.

### Create a Fine-Grained Token (Recommended)

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Fine-grained tokens](https://github.com/settings/tokens?type=beta)

2. Click "Generate new token"

3. Configure the token:
   ```
   Token name: mirror-sync-token
   Expiration: 90 days (or custom)
   Resource owner: omrozmn
   Repository access: Only select repositories
   Selected repositories: x-ear-mirror
   ```

4. Set Permissions:
   ```
   Repository permissions:
   - Contents: Read and write
   - Metadata: Read-only (automatically selected)
   ```

5. Click "Generate token"

6. **COPY THE TOKEN NOW** - You won't see it again!

### Alternative: Classic Token

If fine-grained tokens don't work:

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)

2. Click "Generate new token (classic)"

3. Configure:
   ```
   Note: mirror-sync-token
   Expiration: 90 days
   Scopes: repo (full control)
   ```

4. Generate and copy the token

---

## Step 3: Add the Token to Main Repository Secrets

The token must be stored as a secret in the **main** repository (x-ear).

### Option A: GitHub Web Interface

1. Go to your main repository: `https://github.com/omrozmn/x-ear`

2. Navigate to: Settings > Secrets and variables > Actions

3. Click "New repository secret"

4. Add the secret:
   ```
   Name: MIRROR_REPO_TOKEN
   Secret: [paste your token here]
   ```

5. Click "Add secret"

### Option B: GitHub CLI

```bash
# Navigate to your main repository
cd /Users/omerozmen/Desktop/x-ear\ web\ app/x-ear

# Set the secret
gh secret set MIRROR_REPO_TOKEN
# Paste your token when prompted
```

---

## Step 4: Configure Branch Protection (Mirror)

Protect the mirror's main branch to prevent direct pushes from external developers.

### GitHub Web Interface

1. Go to mirror repository: `https://github.com/omrozmn/x-ear-mirror`

2. Navigate to: Settings > Branches

3. Click "Add branch protection rule"

4. Configure:
   ```
   Branch name pattern: main
   
   [x] Require a pull request before merging
       [x] Require approvals: 1
       [ ] Dismiss stale PR approvals when new commits are pushed
   
   [x] Require status checks to pass before merging
       [ ] Require branches to be up to date (optional)
   
   [ ] Do not allow bypassing the above settings
       Note: Keep this unchecked so the sync workflow can push
   
   [x] Allow force pushes
       [x] Specify who can force push: (leave empty for admins only)
       Note: This is needed for the sync workflow
   ```

5. Click "Create" or "Save changes"

### Important Notes

- The sync workflow uses force push, so "Allow force pushes" must be enabled
- External developers can only submit PRs, not push directly
- Only repository admins (you) can merge PRs

---

## Step 5: Test the Sync

### Method 1: Manual Trigger via GitHub UI

1. Go to main repository: `https://github.com/omrozmn/x-ear`

2. Navigate to: Actions > Sync to Mirror Repository

3. Click "Run workflow"

4. Select options:
   ```
   Branch: main
   Force sync: false (or true for first run)
   Dry run: true (to test without pushing)
   ```

5. Click "Run workflow"

6. Watch the workflow execution

7. If dry run succeeds, run again with `dry_run: false`

### Method 2: Manual Script

```bash
# Navigate to main repository
cd /Users/omerozmen/Desktop/x-ear\ web\ app/x-ear

# Make scripts executable
chmod +x scripts/sync-mirror.sh
chmod +x scripts/clean-mirror-files.sh

# Test with dry run
./scripts/sync-mirror.sh --dry-run

# If successful, run actual sync
MIRROR_REPO_TOKEN=your_token_here ./scripts/sync-mirror.sh
```

### Method 3: Push to Main

1. Make any change in the main repository
2. Commit and push to main branch
3. The workflow should trigger automatically
4. Check Actions tab for status

### Verify Sync Success

After sync completes:

1. Go to mirror repository: `https://github.com/omrozmn/x-ear-mirror`

2. Verify:
   - [ ] Files are present
   - [ ] No `.env` files (except `.env.example`)
   - [ ] No `node_modules` or `__pycache__`
   - [ ] No database files
   - [ ] `.mirror-sync-info.json` exists with sync metadata

---

## Step 6: Onboard External Developers

### Add Collaborator

1. Go to mirror repository settings

2. Navigate to: Settings > Collaborators

3. Click "Add people"

4. Enter their GitHub username

5. Select permission level:
   - **Read**: Can clone and view code
   - **Triage**: Can manage issues and PRs
   - **Write**: Can push to non-protected branches (NOT recommended)

6. They will receive an email invitation

### Share Documentation

Send the external developer:

1. Mirror repository URL: `https://github.com/omrozmn/x-ear-mirror`

2. Link to CONTRIBUTING.md in the mirror

3. Development environment setup instructions

### Onboarding Checklist

```markdown
## External Developer Onboarding

Developer: [Name]
GitHub: [username]
Date Added: [date]

### Access
- [ ] Added as collaborator to x-ear-mirror
- [ ] Collaborator invitation accepted
- [ ] Verified can clone repository

### Documentation
- [ ] Shared CONTRIBUTING.md link
- [ ] Shared development setup guide
- [ ] Explained PR workflow

### Communication
- [ ] Added to project communication channel (if any)
- [ ] Scheduled kickoff meeting (if needed)
- [ ] Provided point of contact for questions
```

---

## Troubleshooting

### Sync Workflow Fails with "Token Invalid"

**Cause**: Token expired or has insufficient permissions

**Solution**:
1. Generate a new token (see Step 2)
2. Update the secret in main repo (see Step 3)
3. Re-run the workflow

### Sync Workflow Fails with "Secrets Detected"

**Cause**: The security scan found potential secrets in files

**Solution**:
1. Check workflow logs for flagged files
2. Remove secrets from those files
3. Use environment variables instead
4. Re-run the workflow

### Mirror Repository Shows No Files

**Cause**: First sync needs initial commit in mirror

**Solution**:
```bash
cd x-ear-mirror
echo "# X-EAR Mirror" > README.md
git add README.md
git commit -m "Initial commit"
git push origin main
```

Then re-run the sync workflow.

### Force Push Rejected

**Cause**: Branch protection prevents force push

**Solution**:
1. Go to mirror repo > Settings > Branches
2. Edit the main branch protection rule
3. Enable "Allow force pushes"
4. Re-run the sync

### External Developer Can't Submit PR

**Cause**: They need to fork the repository first

**Solution**:
1. External dev forks the mirror repo
2. They clone their fork
3. They push to their fork
4. They create PR from fork to mirror

---

## Quick Reference

### Repository URLs

| Repository | URL |
|------------|-----|
| Main (private) | `https://github.com/omrozmn/x-ear` |
| Mirror (for externals) | `https://github.com/omrozmn/x-ear-mirror` |

### Secrets

| Secret Name | Location | Purpose |
|-------------|----------|---------|
| `MIRROR_REPO_TOKEN` | Main repo | Push access to mirror |

### Files Created

| File | Purpose |
|------|---------|
| `.github/workflows/mirror-sync.yml` | Automated sync workflow |
| `.gitignore.mirror` | Gitignore for mirror repo |
| `CONTRIBUTING.mirror.md` | Contributor guidelines |
| `docs/mirror-repo-architecture.md` | Architecture documentation |
| `scripts/sync-mirror.sh` | Manual sync script |
| `scripts/clean-mirror-files.sh` | File filtering script |
| `scripts/mirror-files.txt` | Inclusion list reference |

### Commands

```bash
# Manual sync (dry run)
./scripts/sync-mirror.sh --dry-run

# Manual sync (actual)
MIRROR_REPO_TOKEN=xxx ./scripts/sync-mirror.sh

# Trigger via GitHub CLI
gh workflow run mirror-sync.yml

# Clean files only (for testing)
./scripts/clean-mirror-files.sh . /tmp/test-mirror
```

---

## Security Checklist

Before going live:

- [ ] Token has minimal required permissions
- [ ] Token expiration is set (not indefinite)
- [ ] Branch protection enabled on mirror
- [ ] `.env` files properly excluded
- [ ] Security scan passes
- [ ] No hardcoded secrets in code
- [ ] External developer access documented

---

## Maintenance Schedule

| Frequency | Task |
|-----------|------|
| Weekly | Review pending PRs in mirror |
| Monthly | Rotate `MIRROR_REPO_TOKEN` |
| Monthly | Audit mirror collaborator list |
| Quarterly | Review filtering rules |
| Quarterly | Full security audit of mirror |

---

*Setup document created: December 2024*
