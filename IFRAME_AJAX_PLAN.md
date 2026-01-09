# IFrame/AJAX Capture Plan

## Goals
- Capture DOM changes in top-level documents and same-origin iframes.
- Distinguish initial page captures from deferred (AJAX/mutation-driven) captures.
- Preserve compatibility with the existing runtime listener while enriching capture metadata.
- Update tests to cover the new metadata and iframe/AJAX capture paths.

## Plan
1. **Extension updates**
   - Enable content scripts in iframes (`all_frames`, `match_about_blank`).
   - Add capture metadata fields (`changeSource`, `frameContext`) to forwarder payloads.
   - Populate metadata in the content script for initial, mutation, and manual (spider) captures.

2. **Runtime parsing server updates**
   - Parse capture metadata from payloads.
   - Attach capture metadata to stored documents and to the capture response payload.

3. **Tests**
   - Extend forwarder tests to validate payload metadata.
   - Extend content script tests to validate initial vs mutation capture metadata and frame context data.
   - Extend listener server tests to validate document metadata storage and defaults.

