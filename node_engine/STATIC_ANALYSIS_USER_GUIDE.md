# Static Analysis User Guide

This guide explains how to run the Node Engine static analysis tools and use the local results dashboard.

## Quick start

1. Navigate to the Node Engine directory:

   ```bash
   cd node_engine
   ```

2. Run a static analysis scan (recommended in a Node Engine workspace):

   ```bash
   npm run static_analysis -- --root-dir ../path/to/your/site
   ```

3. Open the URL printed in the terminal. The static analysis server hosts the dashboard.

## CLI usage

The static analysis CLI lives at `node_engine/src/static/cli.js` and is also exposed as the `static_analysis` bin.

### Required arguments

* `--root-dir` (or `--rootDir`): The root folder of the project you want to scan.

### Optional arguments

* `--rules-root` (or `--rulesRoot`): Path to the accessibility rules (defaults to `../rules`).
* `--port`: Port to run the static analysis server (defaults to a random open port).

### Environment variables

* `ROOT_DIR` / `ADA_ROOT_DIR`: Alternative to `--root-dir`.
* `RULES_ROOT` / `ADA_RULES_ROOT`: Alternative to `--rules-root`.
* `PORT`: Alternative to `--port`.

### Example

```bash
static_analysis --root-dir ../my-app --rules-root ../rules --port 46000
```

## Dashboard tour

The static analysis dashboard is served by the static analysis server once a scan completes.

### Summary cards

* **Files scanned**: Total files evaluated.
* **Documents captured**: Parsed documents available for inspection.
* **Issues found**: Total rule violations detected.
* **Rules triggered**: Unique rule IDs that fired.
* **Last updated**: Timestamp of the most recent data refresh.

### Filters

Use the filter panel to narrow the results without rerunning a scan:

* **File search**: Filter files by path.
* **Issue search**: Search issue messages, file paths, or rule IDs.
* **Rule focus**: Limit results to a specific rule.

Select **Clear filters** to reset every filter at once.

### Files table

The Files table summarizes each scanned file and its top rules. Use the download buttons to export JSON or HTML per file.

### Recent issues feed

The issue feed shows the latest eight issues that match the active filters. Use this to triage recent findings quickly.

## Troubleshooting

* **The dashboard shows “Offline”**: Re-run the CLI and confirm the server output lists a port.
* **No results appear**: Ensure the root directory contains files supported by the ruleset.
* **Rules do not match**: Confirm the rules root points at the ADA rules directory.
