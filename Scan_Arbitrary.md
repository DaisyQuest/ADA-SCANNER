# Scan Arbitrary Browser Window

## Goal
Enable ADA Scanner to capture and scan the HTML currently rendered in any browser window without browser automation. The flow should work from a manual capture script or bookmarklet and feed the captured HTML into the existing runtime scan engine.

## Plan
1. **Define capture settings and payload format** so runtime scanning can accept HTML snapshots pushed from a browser window.
2. **Implement a local capture listener** that accepts posted HTML, validates input, and yields runtime documents for scanning.
3. **Wire CLI options** to start the capture listener instead of the HTTP crawler and document usage.
4. **Add tests** for listener behavior, CLI parsing, and runtime scan integration to keep branch coverage high.

## Proposed Capture Flow
1. Start ADA Scanner with a new runtime capture option (local listener).
2. In the target browser window, run a snippet that posts the DOM and URL to the listener.
3. ADA Scanner scans the captured HTML with the existing rule engine and writes the normal report artifacts.

## Browser Capture Snippet (Example)
```js
await fetch("http://127.0.0.1:45892/capture", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: window.location.href,
    html: document.documentElement.outerHTML,
    contentType: "text/html",
    statusCode: 200
  })
});
```

## CLI Sketch
```bash
dotnet Scanner.Cli.dll scan --path ./YourSolution.sln --rules ./rules --out ./artifacts \
  --runtime-capture-port 45892 --runtime-capture-max-docs 1 --runtime-capture-idle-seconds 120
```

## Chromium Extension Export
Use the CLI to export a Chromium extension bundle that posts HTML snapshots to the capture listener:

```bash
dotnet Scanner.Cli.dll export chromium-extension --out ./artifacts/extension \
  --capture-url http://127.0.0.1:45892/capture --capture-token optional-token
```

Load the exported folder as an unpacked extension in Chromium, then click the extension action to send the current page HTML.

## Notes
- The capture listener should bind to localhost only.
- No browser automation is involved.
- Tests must cover success and failure branches for payload validation, token handling, and timeout behavior.
