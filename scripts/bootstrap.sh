#!/usr/bin/env bash
set -euo pipefail

say() {
  printf '%s\n' "$1"
}

section() {
  printf '\n== %s ==\n' "$1"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

try_load_nvm() {
  if has_cmd node; then
    return 0
  fi

  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
  fi
}

has_playwright() {
  if [ -x "./node_modules/.bin/playwright" ]; then
    return 0
  fi

  command -v playwright >/dev/null 2>&1
}

detect_platform() {
  local uname_out
  uname_out="$(uname -s 2>/dev/null || echo unknown)"
  case "$uname_out" in
    Darwin) echo "macos" ;;
    Linux)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        echo "wsl"
      else
        echo "linux"
      fi
      ;;
    *) echo "unknown" ;;
  esac
}

print_install_help() {
  local platform="$1"

  section "Install Help"

  case "$platform" in
    macos)
      say "Recommended:"
      say "  brew install git node"
      ;;
    linux|wsl)
      say "Recommended (Debian/Ubuntu/WSL):"
      say "  sudo apt-get update"
      say "  sudo apt-get install -y git nodejs npm"
      ;;
    *)
      say "Install these commands manually:"
      say "  git"
      say "  node"
      ;;
  esac

  say ""
  say "Optional QA support:"
  say "  npm install -D @playwright/test"
  say "  npx playwright install"
}

platform="$(detect_platform)"
missing_core=()
optional_missing=()

try_load_nvm

section "Keystone Bootstrap"
say "Platform: $platform"

if has_cmd git; then
  say "[ok] git"
else
  say "[missing] git"
  missing_core+=("git")
fi

if has_cmd node; then
  say "[ok] node"
else
  say "[missing] node"
  missing_core+=("node")
fi

say "[ok] handoff id generation uses bash built-ins"
say "[info] preferred runtime is keystone CLI"

if has_playwright; then
  say "[ok] playwright"
else
  say "[optional] playwright not detected"
  optional_missing+=("playwright")
fi

section "Result"

if [ "${#missing_core[@]}" -eq 0 ]; then
  say "Core environment is ready."
else
  say "Core environment is not ready."
  say "Missing core tools: ${missing_core[*]}"
fi

say "Handoff support is ready."

if [ "${#optional_missing[@]}" -eq 0 ]; then
  say "Optional QA automation is ready."
else
  say "Optional QA automation is not installed."
fi

if [ "${#missing_core[@]}" -gt 0 ]; then
  print_install_help "$platform"
fi

section "Next Step"
say "If core is ready, start with:"
say "  cd <project-root>"
say "  ./keystone doctor"
