#!/usr/bin/env python3
import os
import subprocess
import sys


def usage() -> str:
    return (
        "Usage: cli_launcher.py [-p|--port <port>] [-h|--headless] "
        "[-t|--tool <listen|sca>] [-- <sca args>]"
    )


def resolve_script(script_base: str) -> str:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if os.name == "nt":
        return os.path.join(script_dir, f"{script_base}.bat")
    return os.path.join(script_dir, f"{script_base}.sh")


def parse_args(argv: list[str]) -> tuple[str, str | None, bool, list[str]]:
    tool = None
    port = None
    headless = False
    sca_args: list[str] = []
    index = 0

    while index < len(argv):
        arg = argv[index]
        if arg in ("-t", "--tool"):
            if index + 1 >= len(argv):
                raise ValueError(f"Missing value for {arg}.")
            tool = argv[index + 1]
            index += 2
            if tool == "sca":
                sca_args = argv[index:]
                break
            continue
        if arg in ("-p", "--port"):
            if index + 1 >= len(argv):
                raise ValueError(f"Missing value for {arg}.")
            port = argv[index + 1]
            index += 2
            continue
        if arg in ("-h", "--headless"):
            headless = True
            index += 1
            continue
        if arg == "--help":
            print(usage())
            sys.exit(0)
        if arg == "--":
            sca_args = argv[index + 1 :]
            break
        raise ValueError(f"Unknown option: {arg}")

    if tool is None:
        tool = "listen"

    if tool == "sca" and sca_args[:1] == ["--"]:
        sca_args = sca_args[1:]

    if port and not port.isdigit():
        raise ValueError("Port must be a number.")

    return tool, port, headless, sca_args


def run() -> int:
    try:
        tool, port, headless, sca_args = parse_args(sys.argv[1:])
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        print(usage(), file=sys.stderr)
        return 2

    print("ADA Scanner CLI Launcher")
    print(f"Selected tool: {tool}")

    if tool == "sca":
        if port or headless:
            print("Warning: --port/--headless ignored for sca.", file=sys.stderr)
        if sca_args:
            print("Static analysis args: " + " ".join(sca_args))
        else:
            print("Static analysis args: (none)")
        script = resolve_script("sca")
        return subprocess.call([script, *sca_args])

    if tool == "listen":
        if port:
            print(f"Port override: {port}")
        else:
            print("Port override: (default)")
        if headless:
            print("Headless: enabled (monitoring console disabled).")
        else:
            print("Headless: disabled")
        args: list[str] = []
        if port:
            args.extend(["--port", port])
        if headless:
            args.append("--headless")
        script = resolve_script("listen")
        return subprocess.call([script, *args])

    print(f"Unknown tool: {tool} (expected listen or sca).", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(run())
