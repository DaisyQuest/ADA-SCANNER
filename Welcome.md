# Testing & Quality Specification

## Spec items
- **Unit tests required for all logic branches**
  - Every conditional path (if/else, switch/case, guard clauses, error branches) must have a corresponding unit test.
  - Branches that cannot be tested must include an explicit justification in the test suite (see “Documented expectations”).
- **Branch coverage target**
  - Project-wide branch coverage must be **95–100%**, with a default expectation of **100%** for new or changed code.
- **Headless CLI tests for each entrypoint**
  - Each CLI entrypoint must have at least one headless, automated test that validates:
    - Successful execution path.
    - Failure path (invalid args, missing config, or expected error handling).
    - Deterministic output or exit codes.

## Offline constraints
- Tests must **not access the network** under any circumstances.
- Tests must be **fixture-driven only** (no live external dependencies).
- Any data required for tests must be provided via local fixtures or test doubles.

## Continuous enforcement
- CI must fail if:
  - Branch coverage drops below the configured threshold.
  - Any CLI entrypoint lacks headless test coverage.
  - Tests attempt network access (enforced via test harness or CI network sandboxing).
- Checklist items to verify on every change:
  - [ ] Branch coverage threshold is met (95–100%).
  - [ ] Unit tests exist for all logic branches.
  - [ ] Headless CLI tests exist for every entrypoint.
  - [ ] Test suite is fully offline and fixture-driven.

## Documented expectations
- **All new code must include unit tests.**
- **All branches must be tested or explicitly justified.**
  - If a branch cannot be tested, document the reason in the test file (e.g., `// branch not testable: <reason>`), and track it in coverage reports.
