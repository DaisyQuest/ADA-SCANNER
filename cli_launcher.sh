#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

tool=""
port=""
headless=false
sca_args=()

usage() {
  cat <<'USAGE'
Usage: cli_launcher.sh [-p|--port <port>] [-h|--headless] [-t|--tool <listen|sca>] [-- <sca args>]
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
    -t|--tool)
      require_value "$1" "${2:-}"
      tool="$2"
      shift 2
      if [[ "$tool" == "sca" ]]; then
        sca_args=("$@")
        break
      fi
      ;;
    -p|--port)
      require_value "$1" "${2:-}"
      port="$2"
      shift 2
      ;;
    -h|--headless)
      headless=true
      shift
      ;;
    --)
      shift
      sca_args=("$@")
      break
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

if [[ -z "$tool" ]]; then
  tool="listen"
fi

if [[ -n "$port" && ! "$port" =~ ^[0-9]+$ ]]; then
  echo "Port must be a number." >&2
  exit 2
fi

if [[ "$tool" == "sca" ]]; then
  if [[ ${#sca_args[@]} -gt 0 && "${sca_args[0]}" == "--" ]]; then
    sca_args=("${sca_args[@]:1}")
  fi
  if [[ -n "$port" || "$headless" == "true" ]]; then
    echo "Warning: --port/--headless ignored for sca." >&2
  fi
  echo "ADA Scanner CLI Launcher"
  echo "Selected tool: sca"
  if [[ ${#sca_args[@]} -eq 0 ]]; then
    echo "Static analysis args: (none)"
  else
    echo "Static analysis args: ${sca_args[*]}"
  fi
  exec "$SCRIPT_DIR/sca.sh" "${sca_args[@]}"
elif [[ "$tool" == "listen" ]]; then
  echo "ADA Scanner CLI Launcher"
  echo "Selected tool: listen"
  args=()
  if [[ -n "$port" ]]; then
    args+=("--port" "$port")
    echo "Port override: $port"
  else
    echo "Port override: (default)"
  fi
  if [[ "$headless" == "true" ]]; then
    args+=("--headless")
    echo "Headless: enabled (monitoring console disabled)."
  else
    echo "Headless: disabled"
  fi
  exec "$SCRIPT_DIR/listen.sh" "${args[@]}"
else
  echo "Unknown tool: $tool (expected listen or sca)." >&2
  exit 2
fi
