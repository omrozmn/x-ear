#!/bin/bash

# ============================================
# Mirror Repository Sync Script
# ============================================
# This script manually syncs the main repository to the mirror.
# Use this for local testing or emergency manual syncs.
# ============================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIRROR_REPO="${MIRROR_REPO:-omrozmn/x-ear-mirror}"
MIRROR_BRANCH="${MIRROR_BRANCH:-main}"
TEMP_DIR="${TEMP_DIR:-/tmp/mirror-sync-$$}"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"

# Script directory (where this script is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Repository root (parent of scripts/)
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ============================================
# Functions
# ============================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        log_info "Cleaning up temporary directory..."
        rm -rf "$TEMP_DIR"
    fi
}

trap cleanup EXIT

show_help() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Manually sync the main repository to the mirror repository.

OPTIONS:
    -h, --help          Show this help message
    -n, --dry-run       Show what would be synced without pushing
    -v, --verbose       Enable verbose output
    -t, --token TOKEN   GitHub token for pushing to mirror
    -r, --repo REPO     Mirror repository (default: $MIRROR_REPO)
    -b, --branch BRANCH Mirror branch (default: $MIRROR_BRANCH)

ENVIRONMENT VARIABLES:
    MIRROR_REPO_TOKEN   GitHub token (alternative to -t flag)
    MIRROR_REPO         Mirror repository
    MIRROR_BRANCH       Mirror branch
    DRY_RUN             Set to 'true' for dry run
    VERBOSE             Set to 'true' for verbose output

EXAMPLES:
    # Dry run to see what would be synced
    ./sync-mirror.sh --dry-run

    # Sync with token
    ./sync-mirror.sh --token ghp_xxxxxxxxxxxx

    # Using environment variable
    MIRROR_REPO_TOKEN=ghp_xxxx ./sync-mirror.sh

EOF
}

# ============================================
# Parse Arguments
# ============================================

TOKEN="${MIRROR_REPO_TOKEN:-}"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -n|--dry-run)
            DRY_RUN="true"
            shift
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -t|--token)
            TOKEN="$2"
            shift 2
            ;;
        -r|--repo)
            MIRROR_REPO="$2"
            shift 2
            ;;
        -b|--branch)
            MIRROR_BRANCH="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# ============================================
# Validation
# ============================================

log_info "Starting mirror sync process..."
log_info "Repository root: $REPO_ROOT"
log_info "Mirror repository: $MIRROR_REPO"
log_info "Mirror branch: $MIRROR_BRANCH"

if [ "$DRY_RUN" = "true" ]; then
    log_warn "DRY RUN MODE - No changes will be pushed"
fi

if [ "$DRY_RUN" != "true" ] && [ -z "$TOKEN" ]; then
    log_error "No GitHub token provided. Use -t flag or MIRROR_REPO_TOKEN environment variable."
    exit 1
fi

# Check if we're in a git repository
if [ ! -d "$REPO_ROOT/.git" ]; then
    log_error "Not a git repository: $REPO_ROOT"
    exit 1
fi

# ============================================
# Create Temp Directory and Clean Files
# ============================================

log_info "Creating temporary directory: $TEMP_DIR"
mkdir -p "$TEMP_DIR/mirror"

log_info "Filtering and copying production files..."

cd "$REPO_ROOT"

# Call the clean script if it exists, otherwise do inline filtering
if [ -f "$SCRIPT_DIR/clean-mirror-files.sh" ]; then
    log_info "Using clean-mirror-files.sh script..."
    bash "$SCRIPT_DIR/clean-mirror-files.sh" "$REPO_ROOT" "$TEMP_DIR/mirror"
else
    log_info "Performing inline file filtering..."
    
    # Create directory structure
    mkdir -p "$TEMP_DIR/mirror/apps/backend"
    mkdir -p "$TEMP_DIR/mirror/apps/admin"
    mkdir -p "$TEMP_DIR/mirror/apps/web"
    mkdir -p "$TEMP_DIR/mirror/apps/landing"
    mkdir -p "$TEMP_DIR/mirror/packages/core"
    mkdir -p "$TEMP_DIR/mirror/packages/ui-web"
    mkdir -p "$TEMP_DIR/mirror/packages/ui-native"
    mkdir -p "$TEMP_DIR/mirror/scripts"
    mkdir -p "$TEMP_DIR/mirror/docs"
    mkdir -p "$TEMP_DIR/mirror/.github/workflows"

    # Define rsync exclusions
    RSYNC_EXCLUDES=(
        --exclude='node_modules'
        --exclude='__pycache__'
        --exclude='*.pyc'
        --exclude='.pytest_cache'
        --exclude='instance/'
        --exclude='*.db'
        --exclude='*.sqlite'
        --exclude='.venv'
        --exclude='venv'
        --exclude='.env'
        --exclude='.env.local'
        --exclude='.env.production'
        --exclude='.env.development'
        --exclude='*.log'
        --exclude='*.pid'
        --exclude='.cache'
        --exclude='.turbo'
        --exclude='htmlcov'
        --exclude='.coverage'
        --exclude='coverage'
        --exclude='*.egg-info'
        --exclude='dist'
        --exclude='build'
        --exclude='.next'
        --exclude='.nuxt'
        --exclude='storybook-static'
        --exclude='.paddleocr'
        --exclude='.cache_transformers'
        --exclude='*.pem'
        --exclude='*.key'
        --exclude='secrets'
    )

    # Copy directories
    [ -d "apps/backend" ] && rsync -a "${RSYNC_EXCLUDES[@]}" apps/backend/ "$TEMP_DIR/mirror/apps/backend/"
    [ -d "apps/admin" ] && rsync -a "${RSYNC_EXCLUDES[@]}" apps/admin/ "$TEMP_DIR/mirror/apps/admin/"
    [ -d "apps/web" ] && rsync -a "${RSYNC_EXCLUDES[@]}" apps/web/ "$TEMP_DIR/mirror/apps/web/"
    [ -d "apps/landing" ] && rsync -a "${RSYNC_EXCLUDES[@]}" apps/landing/ "$TEMP_DIR/mirror/apps/landing/"
    [ -d "packages/core" ] && rsync -a "${RSYNC_EXCLUDES[@]}" packages/core/ "$TEMP_DIR/mirror/packages/core/"
    [ -d "packages/ui-web" ] && rsync -a "${RSYNC_EXCLUDES[@]}" packages/ui-web/ "$TEMP_DIR/mirror/packages/ui-web/"
    [ -d "packages/ui-native" ] && rsync -a "${RSYNC_EXCLUDES[@]}" packages/ui-native/ "$TEMP_DIR/mirror/packages/ui-native/"
    [ -d "scripts" ] && rsync -a --exclude='*secret*' --exclude='*password*' --exclude='*.local.*' scripts/ "$TEMP_DIR/mirror/scripts/"
    [ -d "docs" ] && rsync -a --exclude='*INTERNAL*' --exclude='*internal*' --exclude='*SECRET*' docs/ "$TEMP_DIR/mirror/docs/"

    # Copy root config files
    [ -f "package.json" ] && cp package.json "$TEMP_DIR/mirror/"
    [ -f "pnpm-lock.yaml" ] && cp pnpm-lock.yaml "$TEMP_DIR/mirror/"
    [ -f "pnpm-workspace.yaml" ] && cp pnpm-workspace.yaml "$TEMP_DIR/mirror/"
    [ -f "package-lock.json" ] && cp package-lock.json "$TEMP_DIR/mirror/"
    [ -f "tsconfig.json" ] && cp tsconfig.json "$TEMP_DIR/mirror/"
    [ -f "openapi.yaml" ] && cp openapi.yaml "$TEMP_DIR/mirror/"
    [ -f "orval.config.mjs" ] && cp orval.config.mjs "$TEMP_DIR/mirror/"

    # Copy docker-compose files (exclude local/override)
    for file in docker-compose*.yml; do
        if [ -f "$file" ] && [[ ! "$file" =~ (secret|local|override) ]]; then
            cp "$file" "$TEMP_DIR/mirror/"
        fi
    done

    # Copy .env.example files
    find . -name '.env.example' -type f | while read -r envfile; do
        dir=$(dirname "$envfile")
        mkdir -p "$TEMP_DIR/mirror/$dir"
        cp "$envfile" "$TEMP_DIR/mirror/$envfile"
    done

    # Copy mirror-specific files
    [ -f ".gitignore.mirror" ] && cp .gitignore.mirror "$TEMP_DIR/mirror/.gitignore"
    [ -f "CONTRIBUTING.mirror.md" ] && cp CONTRIBUTING.mirror.md "$TEMP_DIR/mirror/CONTRIBUTING.md"
fi

# ============================================
# Security Scan
# ============================================

log_info "Running security scan..."

cd "$TEMP_DIR/mirror"
SECRETS_FOUND=0

# Check for .env files (excluding .env.example)
ENV_FILES=$(find . -name '.env' -o -name '.env.local' -o -name '.env.production' 2>/dev/null | grep -v '.env.example' || true)
if [ -n "$ENV_FILES" ]; then
    log_error "Found .env files that should not be in mirror:"
    echo "$ENV_FILES"
    SECRETS_FOUND=1
fi

# Check for private keys
KEY_FILES=$(find . -name "*.pem" -o -name "*.key" -o -name "*.p12" 2>/dev/null || true)
if [ -n "$KEY_FILES" ]; then
    log_error "Found private key files:"
    echo "$KEY_FILES"
    SECRETS_FOUND=1
fi

if [ "$SECRETS_FOUND" -eq 1 ]; then
    log_error "Secrets detected! Aborting sync."
    exit 1
fi

log_success "Security scan passed"

# ============================================
# Generate Metadata
# ============================================

log_info "Generating mirror metadata..."

CURRENT_COMMIT=$(cd "$REPO_ROOT" && git rev-parse HEAD)
CURRENT_BRANCH=$(cd "$REPO_ROOT" && git rev-parse --abbrev-ref HEAD)

cat > "$TEMP_DIR/mirror/.mirror-sync-info.json" << EOF
{
  "syncedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "sourceCommit": "$CURRENT_COMMIT",
  "sourceBranch": "$CURRENT_BRANCH",
  "syncMethod": "manual",
  "note": "This is a read-only mirror. Submit PRs here for review."
}
EOF

# ============================================
# Show Dry Run Results
# ============================================

if [ "$DRY_RUN" = "true" ]; then
    log_info "Files that would be synced:"
    echo ""
    find "$TEMP_DIR/mirror" -type f | sed "s|$TEMP_DIR/mirror/||" | head -100
    echo ""
    log_info "Total files: $(find "$TEMP_DIR/mirror" -type f | wc -l)"
    echo ""
    log_info "Directory structure:"
    find "$TEMP_DIR/mirror" -type d | sed "s|$TEMP_DIR/mirror||" | head -50
    echo ""
    log_success "DRY RUN COMPLETE - No changes pushed"
    exit 0
fi

# ============================================
# Clone Mirror and Sync
# ============================================

log_info "Cloning mirror repository..."

cd "$TEMP_DIR"
git clone --depth 1 "https://x-token:${TOKEN}@github.com/${MIRROR_REPO}.git" mirror-repo

cd mirror-repo
git checkout "$MIRROR_BRANCH" 2>/dev/null || git checkout -b "$MIRROR_BRANCH"

# Remove all existing files except .git
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} \;

# Copy filtered files
cp -r ../mirror/* .
cp -r ../mirror/.* . 2>/dev/null || true

# ============================================
# Commit and Push
# ============================================

log_info "Committing changes..."

git config user.name "Mirror Sync Script"
git config user.email "mirror-sync@local"

git add -A

if git diff --staged --quiet; then
    log_info "No changes to sync"
    exit 0
fi

COMMIT_MSG="Mirror sync: $CURRENT_COMMIT"
COMMIT_BODY="Source commit: $CURRENT_COMMIT
Source branch: $CURRENT_BRANCH
Sync method: manual
Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

git commit -m "$COMMIT_MSG" -m "$COMMIT_BODY"

log_info "Pushing to mirror repository..."
git push --force origin "$MIRROR_BRANCH"

log_success "Mirror sync complete!"
log_info "Mirror repository: https://github.com/$MIRROR_REPO"

# ============================================
# Summary
# ============================================

echo ""
echo "========================================"
echo "         MIRROR SYNC SUMMARY"
echo "========================================"
echo "Status: SUCCESS"
echo "Source commit: $CURRENT_COMMIT"
echo "Source branch: $CURRENT_BRANCH"
echo "Mirror: $MIRROR_REPO"
echo "Files synced: $(find "$TEMP_DIR/mirror" -type f | wc -l)"
echo "========================================"
