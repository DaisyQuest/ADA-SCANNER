# Visual Studio Integration Guide

This guide explains how to wire the ADA Scanner CLI into a Visual Studio solution so that scans can run locally, headlessly, and offline as part of your build or developer workflow.

## What you are integrating

The CLI entrypoints are defined in `src/Scanner.Cli/CommandDispatcher.cs`:

- `scan` (requires `--path` and `--rules`, optional `--out`)
- `rules list` (requires `--rules`)
- `rules validate` (requires `--rules`)
- `report` (requires `--input` and `--out`)

All commands are fully headless and do not use network access.

## Prerequisites

1. **.NET SDK**
   - Build and run the CLI with the .NET SDK compatible with the solution (`AdaScanner.sln`).
2. **Rules directory**
   - Provide a rules folder that matches the per-team layout under `rules/` in this repository (see `rules/RuleInventory.md`).
3. **Local-only paths**
   - All inputs and outputs are file system paths and must be available locally (no network paths required).

## Build the CLI

From the repository root:

```bash
dotnet build AdaScanner.sln
```

If you want a self-contained executable for your team to store in a tools folder:

```bash
dotnet publish src/Scanner.Cli/Scanner.Cli.csproj -c Release -o ./artifacts/cli
```

The publish step produces `Scanner.Cli.dll` and a platform-specific host executable (depending on runtime options). You can use either:

- `dotnet ./artifacts/cli/Scanner.Cli.dll ...`
- `./artifacts/cli/Scanner.Cli ...` (if a platform executable is present)

## CLI command quick reference

### Scan a solution or project

```bash
dotnet ./artifacts/cli/Scanner.Cli.dll scan --path "C:\path\to\YourSolution.sln" --rules "C:\path\to\rules" --out "C:\path\to\scan-output"
```

- Output: `scan.json` written under `--out` (defaults to `./artifacts` if not provided).
- Exit code: `0` on success, `1` on error.

### Validate rules

```bash
dotnet ./artifacts/cli/Scanner.Cli.dll rules validate --rules "C:\path\to\rules"
```

### List rule counts per team

```bash
dotnet ./artifacts/cli/Scanner.Cli.dll rules list --rules "C:\path\to\rules"
```

### Generate a report from a scan

```bash
dotnet ./artifacts/cli/Scanner.Cli.dll report --input "C:\path\to\scan.json" --out "C:\path\to\report-output"
```

- Output: JSON/HTML/Markdown artifacts in the provided output folder.

## Option A: Add as a Visual Studio External Tool

1. **Visual Studio** ➜ **Tools** ➜ **External Tools...** ➜ **Add**.
2. Configure the tool:
   - **Title:** `ADA Scanner (Scan Solution)`
   - **Command:** `dotnet`
   - **Arguments:**
     ```
     "$(SolutionDir)artifacts\cli\Scanner.Cli.dll" scan --path "$(SolutionPath)" --rules "$(SolutionDir)rules" --out "$(SolutionDir)artifacts\scan"
     ```
   - **Initial directory:** `$(SolutionDir)`
3. Click **OK**. You can now run it from **Tools** ➜ **ADA Scanner (Scan Solution)**.

> Notes:
> - Ensure the CLI is published into `$(SolutionDir)artifacts\cli` or update the path to where you stored the CLI.
> - If you prefer to scan a specific `.csproj` instead of the solution, substitute `$(ProjectPath)` in the `--path` argument.

## Option B: Add a post-build step in your `.csproj`

This option runs the scan after each build. Add a target to your project file:

```xml
<Target Name="AdaScanner" AfterTargets="Build">
  <Exec Command='dotnet &quot;$(SolutionDir)artifacts\cli\Scanner.Cli.dll&quot; scan --path &quot;$(ProjectPath)&quot; --rules &quot;$(SolutionDir)rules&quot; --out &quot;$(SolutionDir)artifacts\scan&quot;' />
</Target>
```

**Tips:**
- Use `$(ProjectPath)` for a single project or `$(SolutionPath)` for a solution-wide scan.
- Keep outputs in a dedicated folder like `$(SolutionDir)artifacts\scan` to avoid cluttering source directories.

## Option C: Centralize in `Directory.Build.targets`

If you have multiple projects and want a centralized configuration, create or update `Directory.Build.targets` at the solution root:

```xml
<Project>
  <Target Name="AdaScanner" AfterTargets="Build">
    <Exec Command='dotnet &quot;$(SolutionDir)artifacts\cli\Scanner.Cli.dll&quot; scan --path &quot;$(SolutionPath)&quot; --rules &quot;$(SolutionDir)rules&quot; --out &quot;$(SolutionDir)artifacts\scan&quot;' />
  </Target>
</Project>
```

This applies to all projects in the directory tree.

## Suggested folder layout for Visual Studio solutions

```
YourSolution/
  artifacts/
    cli/                 # published scanner CLI
    scan/                # scan output (scan.json)
    report/              # report output (json/html/md)
  rules/                 # per-team rule folders
  YourSolution.sln
```

## Troubleshooting

- **Missing `--path` or `--rules`:** The CLI will exit with code `1` and a message indicating the missing argument.
- **Invalid rules:** `rules validate` will list errors as `<team>/<ruleId>: <message>` and exit non-zero.
- **No output files:** Ensure the output directory exists or that the CLI has permission to create it.

## Keeping it offline and deterministic

- All operations are local; avoid network paths or external services.
- Keep rules and scan outputs inside the solution tree for reproducibility.

