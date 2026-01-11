#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT="$SCRIPT_DIR"
PORT=""
HEADLESS="false"

usage() {
  cat <<'USAGE'
Usage: listen.sh [--port <port>] [--headless]
USAGE
}

require_value() {
  local flag="$1"
  local value="${2:-}"
  if [[ -z "$value" ]]; then
    echo "Missing value for $flag." >&2
    usage >&2
    exit 2
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--port)
      require_value "$1" "${2:-}"
      PORT="$2"
      shift 2
      ;;
    -h|--headless)
      HEADLESS="true"
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -n "$PORT" && ! "$PORT" =~ ^[0-9]+$ ]]; then
  echo "Port must be a number." >&2
  exit 2
fi

RULES_ROOT="${ADA_RULES_ROOT:-$REPO_ROOT/rules}"
NODE_ENGINE_DIR="$REPO_ROOT/node_engine"

export RULES_ROOT
if [[ -n "$PORT" ]]; then
  export PORT="$PORT"
fi
if [[ "$HEADLESS" == "true" ]]; then
  export ADA_HEADLESS="true"
fi

echo "ADA Scanner Listener Launcher"
echo "Rules root: $RULES_ROOT"
if [[ -n "$PORT" ]]; then
  echo "Port: $PORT"
else
  echo "Port: (default)"
fi
if [[ "$HEADLESS" == "true" ]]; then
  echo "Headless: enabled (monitoring console disabled)."
else
  echo "Headless: disabled"
fi

echo "Executing: npm --prefix $NODE_ENGINE_DIR run start"
exec npm --prefix "$NODE_ENGINE_DIR" run start
