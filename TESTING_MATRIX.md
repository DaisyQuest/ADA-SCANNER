# Testing Matrix (Required Coverage)

This document defines the **required** test dimensions for every rule and for each team-owned rule set.
All new rules and rule updates must map to this matrix before merging.

## Required test dimensions per rule

| Dimension | Required coverage | Notes |
| --- | --- | --- |
| Positive case | ✅ | Rule should detect an issue when the rule conditions are present. |
| Negative case | ✅ | Rule should **not** detect issues when conditions are absent. |
| Boundary case | ✅ | Include a limit/edge scenario (e.g., empty attributes, whitespace-only, minimal markup). |
| Parsing success | ✅ | Rule file parses successfully (JSON/YAML). |
| Parsing failure | ✅ | Rule file parse fails with a clear error for invalid content/format. |
| Schema validation pass | ✅ | Rule passes schema validation (all required fields present and valid). |
| Schema validation fail | ✅ | Rule fails schema validation (missing/invalid fields). |

## Per-team coverage requirements

Each team must demonstrate the full matrix above for **every** rule it owns. Tests must be scoped by
team directory to validate per-team rule loading, validation, and reporting.

Teams (from SPEC-016):
- contrast
- scanner-backend
- ui-frontend
- report-generation
- reflow
- aria-labels
- responsive-size
- hidden-navigation-elements
- error-message-at-top

## Pre-merge test gate (local guidance)

Merges must not proceed until the following checks pass locally (or in CI where available):

1. `dotnet test`
2. `dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura /p:Threshold=95 /p:ThresholdType=branch`

To standardize this gate locally, use `scripts/verify-required-tests.sh`.

## SPEC-013 exceptions

No exceptions are currently declared. If an exception becomes necessary, document it **here** with:
- the exact rule/check impacted
- the branch/logic that cannot be covered
- the rationale
- the planned remediation timeline
