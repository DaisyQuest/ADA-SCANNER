# ADA Scanner Project Specification

All requirements are listed as uniquely identified, verbose statements. Each `SPEC-###` item must have a matching checklist entry in `PROJECT_CHECKLIST.md`.

- SPEC-001: Provide a C#-ecosystem-focused CLI application that scans Visual Studio project directories (`.sln`, `.csproj`) for WCAG 2.0 AA compliance using **static analysis only**.
  - Rationale: Initial compliance coverage must not depend on runtime rendering or browser automation.
  - Inputs: Local filesystem paths to Visual Studio solutions or project directories.
  - Outputs: Local report artifacts (JSON, Markdown, and optionally HTML) stored on disk.

- SPEC-002: CLI entrypoints must include `scan`, `rules list`, `rules validate`, and `report` commands, each runnable in **headless mode** with no GUI and no network access.
  - Rationale: Must run in CI and offline environments.
  - Constraints: Do not invoke any browser automation or remote resources.

- SPEC-003: Rule loading must support **per-team directories** under a top-level `rules/` folder, with distinct team ownership to minimize conflicts.
  - Rationale: Enables parallel work with minimal merge conflicts.
  - Implementation note: Load rules from `rules/<team-name>/` directories.

- SPEC-004: The scanner must prioritize **static analysis** of C#-ecosystem UI artifacts, including but not limited to XAML, Razor, HTML, and resource files referenced by `.csproj`.
  - Rationale: Most Visual Studio UI surfaces are represented in these formats.

- SPEC-005: The system must operate with **offline/no-internet constraints**, including in tests, scans, and reporting.
  - Rationale: Many environments are air-gapped or have restricted connectivity.

- SPEC-006: Future automation hooks must be designed as interfaces (e.g., `IHeadlessRunner`) but **must not** integrate or call Playwright or any other browser automation at this stage.
  - Rationale: Ensure extensibility without introducing runtime browser dependencies.

- SPEC-007: Headless execution requirements must be documented for each CLI command, including required arguments, default output paths, and error behavior.
  - Rationale: Provides consistent usage in CI.

- SPEC-008: Provide a rule schema that supports WCAG 2.0 AA checks relevant to static analysis, including ARIA labels, contrast (where colors are static), hidden navigation elements, error placement, and responsive size concerns that can be inferred from markup or styles.
  - Rationale: Establish comprehensive coverage without runtime rendering.

- SPEC-009: Include a rule-validation pipeline that validates rule files strictly against the schema and fails the scan when invalid rules are detected.
  - Rationale: Prevents false or inconsistent results.

- SPEC-010: The reporting system must aggregate findings per rule, per file, and per team to support triage and ownership.
  - Rationale: Aligns reporting with team folder structure.

- SPEC-011: Include a **synchronization check** that verifies `PROJECT_SPEC.md` and `PROJECT_CHECKLIST.md` contain the same identifiers before any coding session and before any commit.
  - Rationale: Keeps requirements and checklist aligned.

- SPEC-012: Require team work summaries to be appended to `$TEAMNAME_WORK_SUMMARIES.md` immediately before committing changes.
  - Rationale: Maintains per-team progress tracking.

- SPEC-013: Testing must be **exhaustive**: all logic must have unit tests, and **full branch coverage** should be targeted (95–100% where feasible, with documented exceptions).
  - Rationale: Prevents technical debt and ensures scanner accuracy.

- SPEC-014: All CLI execution paths must be testable in a **headless and offline** test environment.
  - Rationale: Tests must reflect operational constraints.

- SPEC-015: No tests or production code may depend on network access or external services.
  - Rationale: Ensures determinism and offline compliance.

- SPEC-016: The documentation set must include a **directory layout** section that lists each team’s rules folder:
  - `rules/contrast/`
  - `rules/scanner-backend/`
  - `rules/ui-frontend/`
  - `rules/report-generation/`
  - `rules/reflow/`
  - `rules/aria-labels/`
  - `rules/responsive-size/`
  - `rules/hidden-navigation-elements/`
  - `rules/error-message-at-top/`

- SPEC-017: Team selection rules must be documented: infer from task context; if unspecified, choose a team at random and record it in the work summary.
  - Rationale: Ensures consistent ownership.

- SPEC-018: Provide guidance for safe commits without conflicts, including branch usage, folder ownership, and merge coordination.
  - Rationale: Prevents multi-team conflicts.

- SPEC-019: Support runtime scanning of HTML captured from an arbitrary browser window via a localhost listener and manual capture snippet, without browser automation.
  - Rationale: Enables scanning of dynamic or authenticated pages that are already open in a browser.

- SPEC-020: Provide cross-platform CLI launchers (bash, PowerShell, Python, Java) that route to listener/static analysis helpers with `--port`, `--headless`, and `--tool` options, emitting meaningful console output.
  - Rationale: Ensures consistent tool entrypoints across environments.
