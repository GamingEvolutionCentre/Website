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
#   - Installs Git and Hugo with pacman
#   - Builds the Hugo site
#   - Generates /index.json automatically for site search
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

if ! command -v pacman >/dev/null 2>&1; then
    error "pacman was not found. This setup script is intended for Arch Linux."
    exit 1
fi

info "Updating package database and installing required packages"

sudo pacman -Syu --needed --noconfirm \
    git \
    hugo

success "System packages installed"

info "Installed versions"

printf 'Git:  '
git --version

printf 'Hugo: '
hugo version

cd "$REPO_DIR"

success "Using repository: $REPO_DIR"

if [[ ! -f "hugo.toml" ]]; then
    error "hugo.toml was not found in $REPO_DIR"
    exit 1
fi

info "Building Hugo website and JSON search index"

hugo --gc --minify

success "Website build completed"

printf '\n'
printf '\033[1;32m============================================================\033[0m\n'
printf '\033[1;32m Gaming Evolution Centre website setup is complete.\033[0m\n'
printf '\033[1;32m============================================================\033[0m\n'
printf '\n'
printf 'Development server:\n'
printf '  hugo server\n'
printf '\n'
printf 'Production build:\n'
printf '  hugo --gc --minify\n'
printf '\n'
