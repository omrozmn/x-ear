# X-EAR

> Medical Device Management System

Welcome to the X-EAR project repository. This is a **read-only mirror** designed for external contributors.

---

## About This Repository

This repository contains the production-ready source code for the X-EAR medical device management system. It is automatically synchronized from the main development repository with sensitive files and internal documentation removed.

### What's Included

- **`apps/backend/`** - Python Flask backend API
- **`apps/admin/`** - Admin panel frontend (React + TypeScript)
- **`apps/web/`** - Main web application (React + TypeScript)
- **`packages/`** - Shared libraries and UI components
- **`docs/`** - Public documentation
- **`openapi.yaml`** - API specification

### What's Not Included

For security and privacy reasons, this mirror does not contain:
- Environment files and secrets
- Internal documentation
- Database files
- Build artifacts and caches
- ML model files

---

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Python 3.10+
- Docker (optional)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/omrozmn/x-ear-mirror.git
   cd x-ear-mirror
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up backend**
   ```bash
   cd apps/backend
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development servers**
   ```bash
   # From root directory
   pnpm dev
   ```

---

## Contributing

We welcome contributions from external developers! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting pull requests.

### Quick Start for Contributors

1. Fork this repository
2. Create a feature branch
3. Make your changes
4. Submit a Pull Request

All PRs are reviewed by the core team before being merged into the main development repository.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python, Flask, SQLAlchemy |
| Frontend | React, TypeScript, TanStack Query |
| UI Components | Custom component library |
| API | REST, OpenAPI 3.0 |
| Database | PostgreSQL |
| Deployment | Docker |

---

## Documentation

- [API Documentation](docs/) - API endpoints and usage
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Architecture](docs/mirror-repo-architecture.md) - System architecture

---

## License

This project is proprietary software. See [LICENSE](LICENSE) for details.

---

## Contact

For questions about contributing, please open an issue in this repository.

---

*This repository is automatically synchronized. Last sync info can be found in `.mirror-sync-info.json`*
