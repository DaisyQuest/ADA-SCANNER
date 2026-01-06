# Runtime Scanning Guide (User + Configuration)

This guide describes how to run **runtime scanning** in ADA Scanner, how to tune the crawler for different environments, and how to wire runtime capture into an ASP.NET Core application. Runtime scanning is optional and complements the **static analysis** scan; it never uses browser automation and it remains offline-capable.

## When to use runtime scanning

Runtime scanning is useful when:

- You want to validate pages that are **generated at runtime** (e.g., MVC/Razor outputs, authenticated experiences, or dynamic HTML).
- You already have seed URLs and want to **capture response HTML** for static rule checks.
- You need to **sample** or **filter** runtime pages (status codes, content types, depth, size, or URL patterns).

Runtime scanning does **not** render pages. It captures HTML responses and applies the same rules engine used for static scanning.

## Quick start

1. Build or obtain the scanner CLI (`Scanner.Cli.dll`).
2. Ensure your rules are in `./rules` with per-team subfolders.
3. Run with at least one seed URL:

```bash
run-ada-scan.exe "C:\path\to\solution.sln" "C:\path\to\out" \
  --runtime-url "https://example.test" \
  --auth-header "Authorization: Bearer <token>"
```

## CLI runtime options

Use these with `run-ada-scan.exe` (or the CLI host executable) to configure the runtime crawler:

| Option | Description | Example |
| --- | --- | --- |
| `--runtime-url <url>` | Seed URL to start crawling. Repeatable. | `--runtime-url https://example.test` |
| `--auth-header <name:value>` | Header added to all runtime requests. Repeatable. | `--auth-header "Authorization: Bearer abc"` |
| `--runtime-include <pattern>` | Regex include pattern for URLs. Repeatable. | `--runtime-include "example\\.test"` |
| `--runtime-exclude <pattern>` | Regex exclude pattern for URLs. Repeatable. | `--runtime-exclude "logout"` |
| `--runtime-max-pages <count>` | Maximum number of pages to crawl. | `--runtime-max-pages 50` |
| `--runtime-max-depth <depth>` | Maximum link depth from seeds. `0` = seeds only. | `--runtime-max-depth 1` |
| `--runtime-allowed-status <n>` | Allowed HTTP status code. Repeatable. | `--runtime-allowed-status 200` |
| `--runtime-excluded-status <n>` | Excluded HTTP status code. Repeatable. | `--runtime-excluded-status 401` |
| `--runtime-allowed-content-type <type>` | Allowed content type. Repeatable. | `--runtime-allowed-content-type application/xhtml+xml` |
| `--runtime-excluded-content-type <type>` | Excluded content type. Repeatable. | `--runtime-excluded-content-type text/plain` |
| `--runtime-max-body-bytes <n>` | Max response bytes captured per page. | `--runtime-max-body-bytes 1048576` |
| `--runtime-sample-rate <0-1>` | Random sampling rate for captured documents. | `--runtime-sample-rate 0.25` |

### Default behavior

If you omit a runtime option, the following defaults apply:

- **Rules root:** derived from `./rules` (same as static scan).
- **Max pages:** `50`.
- **Max depth:** unlimited (only constrained by max pages).
- **Allowed status codes:** all HTTP status codes.
- **Excluded status codes:** none.
- **Allowed content types:** `text/html`.
- **Excluded content types:** none.
- **Max body bytes:** `1,048,576` (1 MiB).
- **Sample rate:** `1.0` (capture all).

## Configuration guidance

### Authentication headers

Many runtime pages require authentication. Use one or more `--auth-header` values:

```bash
--auth-header "Authorization: Bearer <token>" \
--auth-header "X-Client-Id: internal-tool"
```

Headers are injected into every runtime HTTP request.

### Limiting crawl scope

Use include/exclude patterns and max depth to keep runtime scans tight and fast:

```bash
--runtime-include "example\\.test" \
--runtime-exclude "logout|signout|admin" \
--runtime-max-depth 1 \
--runtime-max-pages 10
```

### Content-type filtering

Runtime capture defaults to `text/html`. To include XHTML or specific HTML-like types:

```bash
--runtime-allowed-content-type application/xhtml+xml \
--runtime-allowed-content-type text/html
```

To exclude types (even if otherwise allowed):

```bash
--runtime-excluded-content-type text/plain
```

### Status code filtering

Only capture pages with specific status codes:

```bash
--runtime-allowed-status 200 \
--runtime-allowed-status 204
```

Or exclude expected failures (e.g., 401/403 in unauthenticated runs):

```bash
--runtime-excluded-status 401 \
--runtime-excluded-status 403
```

### Sampling for large sites

If a site is large but you still want insight, sample captured pages:

```bash
--runtime-sample-rate 0.1
```

Sampling happens after the crawler discovers a page and validates its content type/status.

## ASP.NET Core response capture configuration

If you want to capture HTML directly from a running ASP.NET Core app (without crawling), you can wire the runtime capture middleware and feed the resulting documents into the runtime scan engine.

### Example middleware setup

```csharp
app.UseResponseCapture(new ResponseCaptureOptions
{
    MaxBodyBytes = 1024 * 1024,
    ChannelCapacity = 100
});
```

### Processing captured documents

Captured documents are pushed into a channel. You can read from it using `ChannelRuntimeDocumentSource`:

```csharp
var source = new ChannelRuntimeDocumentSource(captureChannel.Reader);
var engine = new RuntimeScanEngine(source, new RuleLoader(), CheckRegistry.Default());
var result = await engine.ScanAsync(runtimeOptions, cancellationToken);
```

## Output artifacts

Runtime results are included alongside static scan results in:

- `scan.json` (static scan)
- `report.json`, `report.html`, `report.md` (combined report)

The report includes runtime seed URLs and any runtime issues that were detected.
