#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${PRIMEFLOW_INSTALL_REPO_URL:-https://github.com/heyallencao/PrimeFlow.git}"
INSTALL_DIR="${HOME}/.primeflow/runtime/PrimeFlow"
LEGACY_INSTALL_DIR="${HOME}/.agents/skills/PrimeFlow"
STAGE_DIR="${HOME}/.primeflow/runtime/.PrimeFlow.clone.$$"
FORCE_OVERWRITE="${PRIMEFLOW_INSTALL_FORCE:-0}"
INSTALL_ARGS=()

say() { printf '%s\n' "$1"; }

cleanup() {
  rm -rf "$STAGE_DIR"
}

trap cleanup EXIT

while [ "$#" -gt 0 ]; do
  case "$1" in
    --force|-f|-y|--yes)
      FORCE_OVERWRITE=1
      ;;
    --agent|--agents)
      if [ "$#" -lt 2 ]; then
        say "Usage: bash install.sh [--force] [--agent <name>] [--agents <name1,name2,...>]"
        exit 1
      fi
      INSTALL_ARGS+=("$1" "$2")
      shift
      ;;
    *)
      say "ERROR: unknown argument: $1"
      say "Usage: bash install.sh [--force] [--agent <name>] [--agents <name1,name2,...>]"
      exit 1
      ;;
  esac
  shift
done

say "PrimeFlow installer"
say "========================================"

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  say ""
  say "ERROR: Node.js was not found. Install it first:"
  case "$(uname -s)" in
    Darwin) say "   brew install node" ;;
    Linux)  say "   sudo apt-get install -y nodejs npm" ;;
    *)      say "   https://nodejs.org" ;;
  esac
  exit 1
fi

# Check git
if ! command -v git >/dev/null 2>&1; then
  say "ERROR: git was not found. Install git first."
  exit 1
fi

# If an installation already exists, ask before overwriting it
if [ -d "$INSTALL_DIR" ] || [ -d "$LEGACY_INSTALL_DIR" ]; then
  say ""
  if [ -d "$INSTALL_DIR" ]; then
    say "WARNING: existing PrimeFlow installation detected: $INSTALL_DIR"
  fi
  if [ -d "$LEGACY_INSTALL_DIR" ] && [ "$LEGACY_INSTALL_DIR" != "$INSTALL_DIR" ]; then
    say "WARNING: legacy PrimeFlow installation detected: $LEGACY_INSTALL_DIR"
  fi
  if [ "$FORCE_OVERWRITE" = "1" ]; then
    say "--force detected. Existing installation will be replaced."
    reply="y"
  elif [ -r /dev/tty ]; then
    printf "Overwrite the existing installation? [y/N] " >/dev/tty
    read -r reply </dev/tty
  else
    say "This is a non-interactive install, so overwrite confirmation cannot be read."
    say "To overwrite, run again with:"
    say "  curl -fsSL https://raw.githubusercontent.com/heyallencao/PrimeFlow/main/scripts/install.sh | bash -s -- --force"
    say "Or set the environment variable:"
    say "  PRIMEFLOW_INSTALL_FORCE=1"
    exit 1
  fi
  case "$reply" in
    [Yy]*) ;;
    *)     say "Install cancelled."; exit 0 ;;
  esac
fi

say ""
say "Cloning PrimeFlow..."
mkdir -p "$(dirname "$INSTALL_DIR")"
rm -rf "$STAGE_DIR"
git clone --single-branch --depth 1 "$REPO_URL" "$STAGE_DIR"

say ""
say "Running PrimeFlow install..."
cd "$STAGE_DIR"
if [ "${#INSTALL_ARGS[@]}" -gt 0 ]; then
  node ./bin/primeflow.mjs install "${INSTALL_ARGS[@]}"
else
  node ./bin/primeflow.mjs install
fi

say ""
say "========================================"
say "PrimeFlow installed successfully."
say ""
say "See the install summary above for host-specific next steps."
say "For more details, read README.md and docs/installation.md."
