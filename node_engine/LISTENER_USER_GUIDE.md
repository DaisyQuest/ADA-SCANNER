# Runtime Listener User Guide

This guide covers the Node Engine runtime listener server used for live ADA scanning events.

## Quick start

1. Navigate to the Node Engine directory:

   ```bash
   cd node_engine
   ```

2. Start the listener server:

   ```bash
   npm start
   ```

3. Open the URL printed in the console to view the listener dashboard.

## CLI usage

The listener CLI is implemented in `node_engine/src/cli/ListenerCli.js` and launched by `src/cli/startListener.js`.

### Required configuration

* **Rules root**: The listener needs access to the ADA rules directory. By default the `npm start` script sets `RULES_ROOT=../rules`.

### Optional configuration

* **PORT**: Set a custom port for the listener server.

### Example

```bash
RULES_ROOT=../rules PORT=45892 node ./src/cli/startListener.js
```

## Dashboard tour

The listener dashboard highlights runtime scan results as they arrive.

### Summary cards

* **Files scanned**: Number of files observed by the runtime listener.
* **Issues found**: Total runtime issues detected.
* **Rules triggered**: Unique rules that fired during runtime scanning.

### Files table

Use the downloads column to export per-file JSON or HTML reports for offline sharing.

### Recent issues feed

Track the latest issues as they stream in while the listener runs.

## Troubleshooting

* **Server does not start**: Verify the `RULES_ROOT` path and ensure the port is free.
* **No issues appear**: Confirm that runtime scanning is sending events to the listener.
