#!/bin/bash

# ============================================
# Clean Mirror Files Script
# ============================================
# This script filters and copies production-ready files
# from the source repository to a destination directory.
# Used by both the GitHub Action and manual sync script.
# ============================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# Arguments
# ============================================

SOURCE_DIR="${1:-$(pwd)}"
DEST_DIR="${2:-/tmp/mirror-clean}"
VERBOSE="${VERBOSE:-false}"

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

show_help() {
    cat << EOF
Usage: $(basename "$0") [SOURCE_DIR] [DEST_DIR]

Filter and copy production-ready files from source to destination.

ARGUMENTS:
    SOURCE_DIR    Source repository directory (default: current directory)
    DEST_DIR      Destination directory for cleaned files (default: /tmp/mirror-clean)

ENVIRONMENT VARIABLES:
    VERBOSE       Set to 'true' for verbose rsync output

EXAMPLES:
    # Clean current directory to /tmp/mirror-clean
    ./clean-mirror-files.sh

    # Specify source and destination
    ./clean-mirror-files.sh /path/to/repo /path/to/output

    # Verbose mode
    VERBOSE=true ./clean-mirror-files.sh

EOF
}

# ============================================
# Parse Arguments
# ============================================

if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

# ============================================
# Validation
# ============================================

if [ ! -d "$SOURCE_DIR" ]; then
    log_error "Source directory does not exist: $SOURCE_DIR"
    exit 1
fi

log_info "Source directory: $SOURCE_DIR"
log_info "Destination directory: $DEST_DIR"

# ============================================
# Create Directory Structure
# ============================================

log_info "Creating directory structure..."

mkdir -p "$DEST_DIR"
mkdir -p "$DEST_DIR/apps/backend"
mkdir -p "$DEST_DIR/apps/admin"
mkdir -p "$DEST_DIR/apps/web"
mkdir -p "$DEST_DIR/apps/landing"
mkdir -p "$DEST_DIR/apps/mobile"
mkdir -p "$DEST_DIR/packages/core"
mkdir -p "$DEST_DIR/packages/ui-web"
mkdir -p "$DEST_DIR/packages/ui-native"
mkdir -p "$DEST_DIR/scripts"
mkdir -p "$DEST_DIR/docs"
mkdir -p "$DEST_DIR/.github/workflows"

# ============================================
# Define Exclusion Patterns
# ============================================

# Common exclusions for all directories
COMMON_EXCLUDES=(
    # Dependencies
    --exclude='node_modules'
    --exclude='.pnp'
    --exclude='.pnp.js'
    --exclude='.yarn'
    
    # Python
    --exclude='__pycache__'
    --exclude='*.pyc'
    --exclude='*.pyo'
    --exclude='*.pyd'
    --exclude='.Python'
    --exclude='*.py[cod]'
    --exclude='*\$py.class'
    --exclude='.venv'
    --exclude='venv'
    --exclude='ENV'
    --exclude='env'
    --exclude='.pytest_cache'
    --exclude='.mypy_cache'
    --exclude='.ruff_cache'
    --exclude='*.egg-info'
    --exclude='*.egg'
    --exclude='pip-wheel-metadata'
    
    # Build outputs
    --exclude='dist'
    --exclude='build'
    --exclude='out'
    --exclude='.output'
    --exclude='.nuxt'
    --exclude='.next'
    --exclude='.turbo'
    --exclude='*.tsbuildinfo'
    --exclude='tsconfig.tsbuildinfo'
    
    # Environment files (CRITICAL)
    --exclude='.env'
    --exclude='.env.local'
    --exclude='.env.development'
    --exclude='.env.development.local'
    --exclude='.env.test'
    --exclude='.env.test.local'
    --exclude='.env.production'
    --exclude='.env.production.local'
    # Note: .env.example is included
    
    # Secrets and keys (CRITICAL)
    --exclude='*.pem'
    --exclude='*.key'
    --exclude='*.crt'
    --exclude='*.p12'
    --exclude='*.pfx'
    --exclude='secrets'
    --exclude='.secrets'
    
    # Database files
    --exclude='*.db'
    --exclude='*.sqlite'
    --exclude='*.sqlite3'
    --exclude='instance'
    
    # Logs and temp files
    --exclude='*.log'
    --exclude='*.pid'
    --exclude='logs'
    --exclude='tmp'
    --exclude='temp'
    --exclude='.tmp'
    --exclude='.temp'
    
    # Caches
    --exclude='.cache'
    --exclude='.parcel-cache'
    --exclude='.paddleocr'
    --exclude='.cache_transformers'
    --exclude='hf_cache'
    --exclude='huggingface'
    
    # Coverage and testing
    --exclude='coverage'
    --exclude='.coverage'
    --exclude='htmlcov'
    --exclude='.nyc_output'
    --exclude='test-results'
    --exclude='playwright-report'
    
    # IDE and editor
    --exclude='.vscode'
    --exclude='.idea'
    --exclude='*.swp'
    --exclude='*.swo'
    --exclude='*~'
    
    # OS files
    --exclude='.DS_Store'
    --exclude='Thumbs.db'
    
    # Storybook output
    --exclude='storybook-static'
    
    # Local files
    --exclude='*.local'
    --exclude='*.local.*'
)

# Rsync options
RSYNC_OPTS="-a"
if [ "$VERBOSE" = "true" ]; then
    RSYNC_OPTS="-av --progress"
fi

# ============================================
# Copy Backend
# ============================================

log_info "Copying backend..."

if [ -d "$SOURCE_DIR/apps/backend" ]; then
    rsync $RSYNC_OPTS \
        "${COMMON_EXCLUDES[@]}" \
        "$SOURCE_DIR/apps/backend/" \
        "$DEST_DIR/apps/backend/"
    log_success "Backend copied"
else
    log_warn "Backend directory not found"
fi

# ============================================
# Copy Admin Frontend
# ============================================

log_info "Copying admin app..."

if [ -d "$SOURCE_DIR/apps/admin" ]; then
    rsync $RSYNC_OPTS \
        "${COMMON_EXCLUDES[@]}" \
        "$SOURCE_DIR/apps/admin/" \
        "$DEST_DIR/apps/admin/"
    log_success "Admin app copied"
else
    log_warn "Admin directory not found"
fi

# ============================================
# Copy Web Frontend
# ============================================

log_info "Copying web app..."

if [ -d "$SOURCE_DIR/apps/web" ]; then
    rsync $RSYNC_OPTS \
        "${COMMON_EXCLUDES[@]}" \
        "$SOURCE_DIR/apps/web/" \
        "$DEST_DIR/apps/web/"
    log_success "Web app copied"
else
    log_warn "Web directory not found"
fi

# ============================================
# Copy Landing Page
# ============================================

log_info "Copying landing page..."

if [ -d "$SOURCE_DIR/apps/landing" ]; then
    rsync $RSYNC_OPTS \
        "${COMMON_EXCLUDES[@]}" \
        "$SOURCE_DIR/apps/landing/" \
        "$DEST_DIR/apps/landing/"
    log_success "Landing page copied"
else
    log_warn "Landing directory not found"
fi

# ============================================
# Copy Mobile App
# ============================================

log_info "Copying mobile app..."

if [ -d "$SOURCE_DIR/apps/mobile" ]; then
    rsync $RSYNC_OPTS \
        "${COMMON_EXCLUDES[@]}" \
        --exclude='android/.gradle' \
        --exclude='android/build' \
        --exclude='android/app/build' \
        --exclude='ios/Pods' \
        --exclude='ios/build' \
        --exclude='*.jks' \
        --exclude='*.keystore' \
        "$SOURCE_DIR/apps/mobile/" \
        "$DEST_DIR/apps/mobile/"
    log_success "Mobile app copied"
else
    log_warn "Mobile directory not found"
fi

# ============================================
# Copy Packages
# ============================================

log_info "Copying packages..."

if [ -d "$SOURCE_DIR/packages/core" ]; then
    rsync $RSYNC_OPTS \
        "${COMMON_EXCLUDES[@]}" \
        "$SOURCE_DIR/packages/core/" \
        "$DEST_DIR/packages/core/"
fi

if [ -d "$SOURCE_DIR/packages/ui-web" ]; then
    rsync $RSYNC_OPTS \
        "${COMMON_EXCLUDES[@]}" \
        "$SOURCE_DIR/packages/ui-web/" \
        "$DEST_DIR/packages/ui-web/"
fi

if [ -d "$SOURCE_DIR/packages/ui-native" ]; then
    rsync $RSYNC_OPTS \
        "${COMMON_EXCLUDES[@]}" \
        "$SOURCE_DIR/packages/ui-native/" \
        "$DEST_DIR/packages/ui-native/"
fi

log_success "Packages copied"

# ============================================
# Copy Scripts (Filtered)
# ============================================

log_info "Copying scripts..."

if [ -d "$SOURCE_DIR/scripts" ]; then
    rsync $RSYNC_OPTS \
        --exclude='*secret*' \
        --exclude='*SECRET*' \
        --exclude='*password*' \
        --exclude='*PASSWORD*' \
        --exclude='*.local.*' \
        --exclude='*credentials*' \
        "$SOURCE_DIR/scripts/" \
        "$DEST_DIR/scripts/"
    log_success "Scripts copied"
else
    log_warn "Scripts directory not found"
fi

# ============================================
# Copy Documentation (Filtered)
# ============================================

log_info "Copying documentation..."

if [ -d "$SOURCE_DIR/docs" ]; then
    rsync $RSYNC_OPTS \
        --exclude='*INTERNAL*' \
        --exclude='*internal*' \
        --exclude='*SECRET*' \
        --exclude='*secret*' \
        --exclude='*PRIVATE*' \
        --exclude='*private*' \
        --exclude='*CONFIDENTIAL*' \
        --exclude='*confidential*' \
        "$SOURCE_DIR/docs/" \
        "$DEST_DIR/docs/"
    log_success "Documentation copied"
else
    log_warn "Docs directory not found"
fi

# ============================================
# Copy Root Configuration Files
# ============================================

log_info "Copying root configuration files..."

# Package management
[ -f "$SOURCE_DIR/package.json" ] && cp "$SOURCE_DIR/package.json" "$DEST_DIR/"
[ -f "$SOURCE_DIR/pnpm-lock.yaml" ] && cp "$SOURCE_DIR/pnpm-lock.yaml" "$DEST_DIR/"
[ -f "$SOURCE_DIR/pnpm-workspace.yaml" ] && cp "$SOURCE_DIR/pnpm-workspace.yaml" "$DEST_DIR/"
[ -f "$SOURCE_DIR/package-lock.json" ] && cp "$SOURCE_DIR/package-lock.json" "$DEST_DIR/"
[ -f "$SOURCE_DIR/yarn.lock" ] && cp "$SOURCE_DIR/yarn.lock" "$DEST_DIR/"

# TypeScript
[ -f "$SOURCE_DIR/tsconfig.json" ] && cp "$SOURCE_DIR/tsconfig.json" "$DEST_DIR/"

# API specification
[ -f "$SOURCE_DIR/openapi.yaml" ] && cp "$SOURCE_DIR/openapi.yaml" "$DEST_DIR/"

# Orval config
[ -f "$SOURCE_DIR/orval.config.mjs" ] && cp "$SOURCE_DIR/orval.config.mjs" "$DEST_DIR/"
[ -f "$SOURCE_DIR/orval.config.js" ] && cp "$SOURCE_DIR/orval.config.js" "$DEST_DIR/"
[ -f "$SOURCE_DIR/orval.config.ts" ] && cp "$SOURCE_DIR/orval.config.ts" "$DEST_DIR/"

# ESLint/Prettier (optional)
[ -f "$SOURCE_DIR/.eslintrc.js" ] && cp "$SOURCE_DIR/.eslintrc.js" "$DEST_DIR/"
[ -f "$SOURCE_DIR/.eslintrc.json" ] && cp "$SOURCE_DIR/.eslintrc.json" "$DEST_DIR/"
[ -f "$SOURCE_DIR/.prettierrc" ] && cp "$SOURCE_DIR/.prettierrc" "$DEST_DIR/"
[ -f "$SOURCE_DIR/.prettierrc.js" ] && cp "$SOURCE_DIR/.prettierrc.js" "$DEST_DIR/"
[ -f "$SOURCE_DIR/.prettierrc.json" ] && cp "$SOURCE_DIR/.prettierrc.json" "$DEST_DIR/"

log_success "Root configuration files copied"

# ============================================
# Copy Docker Files (Non-Secret)
# ============================================

log_info "Copying Docker files..."

cd "$SOURCE_DIR"
for file in docker-compose*.yml docker-compose*.yaml Dockerfile*; do
    if [ -f "$file" ]; then
        # Skip files with secret/local/override in the name
        if [[ ! "$file" =~ (secret|local|override|Secret|Local|Override) ]]; then
            cp "$file" "$DEST_DIR/"
            log_info "  Copied: $file"
        else
            log_warn "  Skipped (sensitive): $file"
        fi
    fi
done

log_success "Docker files copied"

# ============================================
# Copy .env.example Files
# ============================================

log_info "Copying .env.example files..."

cd "$SOURCE_DIR"
find . -name '.env.example' -type f | while read -r envfile; do
    # Get relative path
    rel_path="${envfile#./}"
    dir=$(dirname "$rel_path")
    
    # Create directory in destination
    mkdir -p "$DEST_DIR/$dir"
    
    # Copy the file
    cp "$envfile" "$DEST_DIR/$rel_path"
    log_info "  Copied: $rel_path"
done

log_success ".env.example files copied"

# ============================================
# Copy Mirror-Specific Files
# ============================================

log_info "Copying mirror-specific files..."

# .gitignore for mirror
if [ -f "$SOURCE_DIR/.gitignore.mirror" ]; then
    cp "$SOURCE_DIR/.gitignore.mirror" "$DEST_DIR/.gitignore"
    log_info "  Copied: .gitignore.mirror -> .gitignore"
fi

# CONTRIBUTING.md for mirror
if [ -f "$SOURCE_DIR/CONTRIBUTING.mirror.md" ]; then
    cp "$SOURCE_DIR/CONTRIBUTING.mirror.md" "$DEST_DIR/CONTRIBUTING.md"
    log_info "  Copied: CONTRIBUTING.mirror.md -> CONTRIBUTING.md"
fi

# README for mirror (if exists)
if [ -f "$SOURCE_DIR/README.mirror.md" ]; then
    cp "$SOURCE_DIR/README.mirror.md" "$DEST_DIR/README.md"
    log_info "  Copied: README.mirror.md -> README.md"
fi

log_success "Mirror-specific files copied"

# ============================================
# Summary
# ============================================

echo ""
log_success "File cleaning complete!"
echo ""
echo "========================================"
echo "         CLEANING SUMMARY"
echo "========================================"
echo "Source: $SOURCE_DIR"
echo "Destination: $DEST_DIR"
echo "Total files: $(find "$DEST_DIR" -type f | wc -l)"
echo "Total size: $(du -sh "$DEST_DIR" | cut -f1)"
echo ""
echo "Directory structure:"
find "$DEST_DIR" -type d -maxdepth 3 | sed "s|$DEST_DIR||"
echo "========================================"
