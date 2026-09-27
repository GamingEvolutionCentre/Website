#!/usr/bin/env bash
set -Eeuo pipefail

# ============================================================
# Gaming Evolution Centre Website - Arch Linux Setup
#
# Run this after cloning/pulling the website repository:
#   chmod +x setup.sh
#   ./setup.sh
#
# What it does:
#   - Checks that the system uses pacman
#   - Installs Git, Hugo, Node.js and npm with pacman
#   - Installs the project's npm dependencies
#   - Builds the Hugo site
#   - Builds the Pagefind search index
# ============================================================

REPO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

info() {
    printf '\n\033[1;36m==>\033[0m %s\n' "$1"
}

success() {
    printf '\033[1;32m✓\033[0m %s\n' "$1"
}

error() {
    printf '\033[1;31mERROR:\033[0m %s\n' "$1" >&2
}

trap 'error "Setup failed on line $LINENO."' ERR

info "Gaming Evolution Centre website setup"

# ------------------------------------------------------------
# Check Arch/pacman
# ------------------------------------------------------------

if ! command -v pacman >/dev/null 2>&1; then
    error "pacman was not found. This setup script is intended for Arch Linux."
    exit 1
fi

# ------------------------------------------------------------
# Install system packages
# ------------------------------------------------------------

info "Updating package database and installing required packages"

sudo pacman -Syu --needed --noconfirm \
    git \
    hugo \
    nodejs \
    npm

success "System packages installed"

# ------------------------------------------------------------
# Show installed versions
# ------------------------------------------------------------

info "Installed versions"

printf 'Git:     '
git --version

printf 'Hugo:    '
hugo version

printf 'Node.js: '
node --version

printf 'npm:     '
npm --version

# ------------------------------------------------------------
# Move to repository root
# ------------------------------------------------------------

cd "$REPO_DIR"

success "Using repository: $REPO_DIR"

# ------------------------------------------------------------
# Check project files
# ------------------------------------------------------------

if [[ ! -f "hugo.toml" ]]; then
    error "hugo.toml was not found in $REPO_DIR"
    exit 1
fi

if [[ ! -f "package.json" ]]; then
    error "package.json was not found in $REPO_DIR"
    exit 1
fi

# ------------------------------------------------------------
# Install Node/npm dependencies
# ------------------------------------------------------------

if [[ -f "package-lock.json" ]]; then
    info "Installing npm dependencies from package-lock.json"
    npm ci
else
    info "Installing npm dependencies"
    npm install
fi

success "npm dependencies installed"

# ------------------------------------------------------------
# Build the website and Pagefind search index
# ------------------------------------------------------------

info "Building Hugo website and Pagefind search index"

npm run build

success "Website build completed"

# ------------------------------------------------------------
# Finished
# ------------------------------------------------------------

printf '\n'
printf '\033[1;32m============================================================\033[0m\n'
printf '\033[1;32m Gaming Evolution Centre website setup is complete.\033[0m\n'
printf '\033[1;32m============================================================\033[0m\n'
printf '\n'
printf 'Development server:\n'
printf '  npm run dev\n'
printf '\n'
printf 'Preview with Pagefind search:\n'
printf '  npm run preview\n'
printf '\n'
printf 'Production build:\n'
printf '  npm run build\n'
printf '\n'
