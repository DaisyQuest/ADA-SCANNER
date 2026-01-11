# CLI Launcher Specification

## Overview
The ADA Scanner CLI launchers provide a consistent entrypoint for starting either the listener server or the static analysis tool across multiple runtimes. Launchers exist in **bash**, **PowerShell**, **Python**, and **Java**, and they delegate execution to platform-specific helper scripts (`listen.*`, `sca.*`).

## Options
| Flag | Long Flag | Description |
| --- | --- | --- |
| `-p` | `--port` | Sets the listener server port. |
| `-h` | `--headless` | Runs without the monitoring console. |
| `-t` | `--tool` | Selects the tool: `listen` or `sca`. |

## Behavior
- **Default tool**: If no `--tool` value is provided, the launcher starts the **listener server** on the default port.
- **Listener mode**: `--tool listen` starts the listener server. Optional `--port` and `--headless` flags apply.
- **Static analysis mode**: `--tool sca` runs the static analysis tool. Any remaining arguments are passed directly to `npm run static_analysis`.

## Entrypoints
- Bash: `cli_launcher.sh`
- PowerShell: `cli_launcher.ps1`
- Python: `cli_launcher.py`
- Java: `CliLauncher.java` (compile and run as a standard Java application)

## Helper Scripts
- Listener:
  - `listen.sh`
  - `listen.ps1`
  - `listen.bat`
- Static analysis:
  - `sca.sh`
  - `sca.ps1`
  - `sca.bat`

## Examples
```bash
./cli_launcher.sh
./cli_launcher.sh --tool listen --port 45892
./cli_launcher.sh --tool sca -- --config ./config.json
```

```powershell
./cli_launcher.ps1
./cli_launcher.ps1 --tool listen --headless --port 45892
./cli_launcher.ps1 --tool sca -- --config .\config.json
```

```bash
python ./cli_launcher.py --tool listen --port 45892
python ./cli_launcher.py --tool sca -- --config ./config.json
```

```bash
javac CliLauncher.java
java CliLauncher --tool listen --port 45892
java CliLauncher --tool sca -- --config ./config.json
```
