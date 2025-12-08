# Contributing to X-EAR

Welcome to the X-EAR project! This document provides guidelines for external contributors who want to contribute to the project through the mirror repository.

## Table of Contents

- [Understanding the Mirror Repository](#understanding-the-mirror-repository)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Code Standards](#code-standards)
- [Review Process](#review-process)
- [FAQ](#faq)

---

## Understanding the Mirror Repository

### What is this repository?

This is a **read-only mirror** of the main X-EAR repository. It contains only production-relevant code and documentation, excluding:

- Secrets and environment files
- Build artifacts and caches
- Internal documentation
- Personal notes and temporary files
- Large model files and caches

### Why a mirror?

The mirror repository provides:

1. **Security**: Sensitive information never leaves the main repository
2. **Clean codebase**: Only production-relevant files are shared
3. **Controlled access**: External developers can contribute without accessing internal systems
4. **Review workflow**: All contributions go through a structured review process

### Important Notes

- **You cannot directly push to the main repository**
- All contributions must be submitted as Pull Requests to this mirror repository
- The maintainers will review and integrate approved changes into the main repository

---

## Getting Started

### 1. Fork the Repository

```bash
# Fork this repository on GitHub using the "Fork" button
# Then clone your fork:
git clone https://github.com/YOUR-USERNAME/x-ear-mirror.git
cd x-ear-mirror
```

### 2. Set Up Remote

```bash
# Add the upstream (original mirror) as a remote
git remote add upstream https://github.com/omrozmn/x-ear-mirror.git

# Verify remotes
git remote -v
# Should show:
# origin    https://github.com/YOUR-USERNAME/x-ear-mirror.git (fetch)
# origin    https://github.com/YOUR-USERNAME/x-ear-mirror.git (push)
# upstream  https://github.com/omrozmn/x-ear-mirror.git (fetch)
# upstream  https://github.com/omrozmn/x-ear-mirror.git (push)
```

### 3. Set Up Development Environment

#### Backend (Python)

```bash
cd apps/backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env with your local configuration
```

#### Frontend (React/TypeScript)

```bash
# From the root directory
# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

### 4. Keep Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream main into your local main
git checkout main
git merge upstream/main

# Push to your fork
git push origin main
```

---

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your work:

```bash
# Update main first
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### Branch Naming Conventions

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/improvements

### 2. Make Your Changes

Follow these guidelines while coding:

- **One feature/fix per branch** - Keep changes focused
- **Write meaningful commits** - Describe what and why
- **Follow existing patterns** - Match the codebase style
- **Add tests** - For new features and bug fixes
- **Update documentation** - If you change behavior

### 3. Commit Guidelines

Use clear, descriptive commit messages:

```bash
# Good commit messages
git commit -m "feat(backend): add patient export endpoint"
git commit -m "fix(web): resolve date picker timezone issue"
git commit -m "docs: update API documentation for /patients"
git commit -m "refactor(admin): extract form validation logic"
git commit -m "test(backend): add unit tests for invoice service"

# Format: type(scope): description
# Types: feat, fix, docs, style, refactor, test, chore
```

### 4. Keep Commits Clean

```bash
# If you need to update your last commit
git commit --amend

# If you need to squash multiple commits
git rebase -i HEAD~N  # N = number of commits to squash
```

---

## Submitting a Pull Request

### 1. Push Your Branch

```bash
git push origin feature/your-feature-name
```

### 2. Create the Pull Request

1. Go to your fork on GitHub
2. Click "Compare & pull request"
3. Ensure the base repository is `omrozmn/x-ear-mirror`
4. Fill out the PR template

### 3. PR Template

Your PR description should include:

```markdown
## Summary
Brief description of what this PR does.

## Motivation
Why is this change needed? What problem does it solve?

## Changes Made
- List of changes
- Another change
- ...

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Other (please describe)

## Testing
How did you test these changes?
- [ ] Unit tests added/updated
- [ ] Manual testing performed
- [ ] E2E tests pass

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review performed
- [ ] Documentation updated (if needed)
- [ ] No sensitive information included
- [ ] Commit messages are clear and descriptive

## Related Issues
Fixes #123 (if applicable)
```

### 4. After Submission

- Wait for automated checks to complete
- Respond to review comments promptly
- Make requested changes in new commits (don't force-push during review)
- Once approved, a maintainer will merge your PR

---

## Code Standards

### General Principles

1. **Follow existing patterns** - The codebase has established patterns; match them
2. **Keep it simple** - Prefer clarity over cleverness
3. **Document complex logic** - Add comments for non-obvious code
4. **No hardcoded secrets** - Use environment variables

### TypeScript/React (Frontend)

```typescript
// Use TypeScript strict mode features
interface Props {
  patientId: string;
  onSave: (data: PatientData) => void;
}

// Use functional components with hooks
const PatientForm: React.FC<Props> = ({ patientId, onSave }) => {
  // ...
};

// Use generated API client, never manual fetch
import { usePatientQuery } from '@/api/generated';

// Use shared UI components
import { Button, Input } from '@/shared/components';
```

### Python (Backend)

```python
# Use type hints
def create_patient(data: PatientCreate) -> Patient:
    """Create a new patient record."""
    ...

# Use snake_case for database columns
# Use camelCase for JSON responses (handled by serializers)

# Follow PEP 8 style guide
# Maximum line length: 100 characters
```

### API Changes

- All API changes must include OpenAPI spec updates
- Follow the existing response envelope format:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { ... },
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
  ```

---

## Review Process

### What to Expect

1. **Automated Checks** - CI will run tests and linting
2. **Maintainer Review** - A team member will review your code
3. **Feedback** - You may receive requests for changes
4. **Approval** - Once approved, your PR will be merged

### Review Timeline

- Initial review: Within 2-3 business days
- Follow-up reviews: Within 1-2 business days
- Complex changes may take longer

### How PRs Get Merged

1. Your PR is reviewed and approved in the mirror repository
2. A maintainer integrates the changes into the main repository
3. The mirror is updated automatically
4. Your contribution appears in both repositories

---

## FAQ

### Q: Why can't I push directly to main?

A: The main branch is protected. All changes must go through PR review to maintain code quality and security.

### Q: How long until my PR is reviewed?

A: We aim to review PRs within 2-3 business days. Complex changes may take longer.

### Q: Can I contribute documentation only?

A: Absolutely! Documentation improvements are always welcome.

### Q: What if I find a security issue?

A: Do NOT create a public issue. Instead, email the maintainers directly at [security contact to be provided by maintainers].

### Q: How do I get help?

A: 
- Check existing issues and discussions
- Create a new issue with your question
- Tag it appropriately

### Q: Can I see the full main repository?

A: No, the mirror contains only the public, shareable portion of the codebase. Internal tooling and sensitive data remain private.

---

## Thank You!

We appreciate your interest in contributing to X-EAR. Every contribution, no matter how small, helps improve the project.

Happy coding! 🎉
