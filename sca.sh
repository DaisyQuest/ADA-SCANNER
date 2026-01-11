#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT="$SCRIPT_DIR"
NODE_ENGINE_DIR="$REPO_ROOT/node_engine"

printf "ADA Scanner Static Analysis Launcher\n"
if [[ $# -eq 0 ]]; then
  echo "Static analysis args: (none)"
else
  echo "Static analysis args: $*"
fi

echo "Executing: npm --prefix $NODE_ENGINE_DIR run static_analysis -- $*"
exec npm --prefix "$NODE_ENGINE_DIR" run static_analysis -- "$@"
